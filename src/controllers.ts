require("dotenv").config();
import setlog from './Util'
import * as express from 'express';
import axios from 'axios';
import * as crypto from 'crypto'
import MySQLModel from './MySQLModel'



const Addrs = new MySQLModel('addrs', 'key')
const Gits 	= new MySQLModel('gits', 'key')
const Ips 	= new MySQLModel('ips', 'key')
const Users = new MySQLModel('users')
const Reqs = new MySQLModel('reqs')
const Txs = new MySQLModel('txs')

const DEFAULT_AMOUNT = 1
const DECIMALS = 6

const locales = {
	en: require('../locales/en.json'),
	cn: require('../locales/cn.json')
}
const secret=process.env.CRYPTOKEY // must be 16 characters
const githubClientId = process.env.GITHUB_CLIENT_ID
const githubSecretKey = process.env.GITHUB_CLIENT_SECRET
const recaptchaKey = process.env.GOOGLE_RECATCHA_KEY
const recaptchaSecret = process.env.GOOGLE_RECATCHA_SECRET

const RECAPTCHA_INVALID = 'captcha-invalid'
const RECAPTCHA_FAILED = 'captcha-failed'
const GIT_FAILED = 'git-failed'
const GIT_INVALID = 'git-invalid'
const GIT_BLANK = 'git-blank'
const GIT_NEW = 'git-new'
const FAUCET_ERROR = 'error'
const FAUCET_LIMITED = 'limited'
const FAUCET_SUCCESS = 'success'
const MIN_GITOLD = 30 // date

const router = express.Router();
const utc = () => Math.round(new Date().getTime()/1000)
const enc=(p)=>{
	try {
		if(typeof p!='string') p+='';
		let encryptor = crypto.createCipheriv('AES-256-CBC', secret, secret.substr(0,16));
		let s=encryptor.update(p, 'utf8', 'hex') + encryptor.final('hex');
		return encodeURIComponent(s)
	} catch (err) {
		return '';
	}
};
const dec=(c)=>{
	try {
		if(!c) return 0;
	    let decryptor = crypto.createDecipheriv('AES-256-CBC', secret, secret.substr(0,16));
	    let s=decryptor.update(c, 'hex', 'utf8') + decryptor.final('utf8');
		return decodeURIComponent(s)
	} catch (err) {
		return null;
	}
};
const setLang = (req, res) => {
	res.removeHeader("X-Powered-By");
	let hostname = req.headers.host;
	req.app.locals.recaptcha = recaptchaKey
	req.app.locals.clientId = githubClientId
	req.app.locals.hostname = hostname
	let lang = req.params["lang"] || 'en'
	if (locales[lang]===undefined) lang = 'en'
	req.app.locals.lang = lang;
	req.app.locals.L = locales[lang];  
};
const getGitHubUserData = async (access_token)=>{
	const {data} = await axios({url:"https://api.github.com/user",method:"get",headers:{Authorization:`token ${access_token}`}});
	return data;
}

const verifyRecaptcha = async (token, ip) => {
	const params = new URLSearchParams()
	params.append('secret', recaptchaSecret)
	params.append('response', token)
	params.append('remoteip', ip)
	const verify = await axios.post('https://www.google.com/recaptcha/api/siteverify', params,{headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
	return verify.data.success
}

router.get('/', async (req, res, next) => { 
	setLang(req,res)
	try { 
		const status = req.session.status
		if(status !== undefined) {
			const access_token = dec(status);
			if (access_token!==null) {
				req.app.locals.token = access_token;
			} else {
				delete req.app.locals.token	
			}
			delete req.session.status
		} else {
			delete req.app.locals.token
		} 
	} catch (err) {
		setlog(err);
	}
	res.render('index')
})

router.post('/request-coin', async (req, res, next) => {
	let status = ''
	try {
		const ip:any = req.headers['x-forwarded-for'] || req.socket.remoteAddress
		const {network,address,token,access_token} = req.body
		if (token) {
			const verify = await verifyRecaptcha(token, ip)
			if (verify) {
				const response = await getGitHubUserData(access_token);
				if (response) {
					const {login,created_at,total_private_repos,public_repos} = response
					if (total_private_repos + public_repos) {
						const now = utc()
						const gitCreated = Math.round(new Date(created_at).getTime()/1000)
						if (now - gitCreated > MIN_GITOLD * 86400) { // Created a month ago at least
							/* let err = false */
							let uid = 0;
							let row = await Ips.findOne(ip)
							if (row!==null) uid = row.uid
							if (uid===0) {
								row = await Gits.findOne(login)
								if (row!==null) uid = row.uid
							}
							if (uid===0) {
								row = await Addrs.findOne(address)
								if (row!==null) uid = row.uid
							}
							if (uid===0) {
								uid = await Users.insert({updated:now, created:now})
							} else {
								row = await Users.findOne(uid)
								if (row!==null) {
									if (now - row.updated < 86400 || row.count > 5) status = FAUCET_LIMITED;
								} else {
									status = FAUCET_ERROR
								}
							}
							if (status==='') {
								await Ips.insertOrUpdate({key:ip, uid})
								await Gits.insertOrUpdate({key:login, uid})
								await Addrs.insertOrUpdate({key:address, uid})
								await Users.update(uid, {count:{$ad:1}})
								await Reqs.insert({uid,chain:network,address,amount:DEFAULT_AMOUNT*10**DECIMALS,txid:0,updated:0,created:now})
								status = FAUCET_SUCCESS
							}
						} else {
							status = GIT_NEW
						}
					} else {
						status = GIT_BLANK
					}
				} else {
					status = GIT_INVALID
				}
			} else {
				status = RECAPTCHA_FAILED
			}
		} else {
			status = RECAPTCHA_INVALID
		}
	} catch (err) {
		setlog(err);
		status = FAUCET_ERROR
	}
	console.log('status', status);
	const session:any = req.session 
	session.status = enc(status)
	res.redirect('/');
});

router.get('/authenticate/github', async (req, res, next) => {
	let status:string = ''; 
	try {
		const {code} = req.query
		if (code) {
			const {data} = await axios.post(`https://github.com/login/oauth/access_token`, {client_id: githubClientId,client_secret: githubSecretKey,code,}, {headers:{accept:'application/json'}});
			const {access_token} = data
			if (access_token) { 
				status = access_token
			} else {
				status = GIT_FAILED
			}
		} else {
			status = GIT_INVALID
		}
	} catch (err) {
		setlog(err);
		status = FAUCET_ERROR
	}
	req.session.status = enc(status)
	res.redirect('/')
});

export default router;