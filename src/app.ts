require("dotenv").config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
/* const isProduction = process.env.NODE_ENV === 'production'; */

import http from 'http';
import https from 'https';
import fs from 'fs';
import express from 'express';
import shrinkRay from 'shrink-ray-current'
import cors from 'cors'
import MySQLModel from './MySQLModel'
import controllers from './controllers'
import session from 'express-session'
import redis from 'redis'
import connectRedis from 'connect-redis'

import setlog from './Util';
process.on("uncaughtException", (err:Error) => setlog('exception',err));
process.on("unhandledRejection", (err:Error) => setlog('rejection',err));

const redisClient = redis.createClient();
const redisStore = connectRedis(session);
redisClient.on('error', (err:Error) => setlog('redisClient',err));
const store = new redisStore({ host: 'localhost', port: 6379, client: redisClient, ttl: 600 });
const SESSIONSECRET = process.env.SESSION_SECRET || ''

Date.now = () => Math.round((new Date().getTime()) / 1000);
MySQLModel.connect({
	
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB_NAME
}).then(async (res:any)=>{
	const app = express()
	const server = http.createServer(app)
	const key = fs.readFileSync(__dirname+'/../certs/generated-private.key', 'utf8')
	const cert = fs.readFileSync(__dirname+'/../certs/29baf73c7f59916d.crt', 'utf8')
	const caBundle = fs.readFileSync(__dirname+'/../certs/gd_bundle-g2-g1.crt', 'utf8')
	const ca = caBundle.split('-----END CERTIFICATE-----\n') .map((cert:any) => cert +'-----END CERTIFICATE-----\n')
	ca.pop()

	let options = {cert,key,ca}
	const httpsServer = https.createServer(options,app)
	app.use(shrinkRay())
	app.use(express.urlencoded({extended: true})); 
	app.use(express.json())
	app.use(cors({
		origin: '*'
	}))
	app.use(express.static(__dirname + '/../public'))
	app.set('views', __dirname + '/../views');
	app.set("view engine", "ejs");
	app.use(session({
		/* key: SESSIONKEY, */
		secret: SESSIONSECRET,
		store,
		resave: true,
		saveUninitialized: true
	}));
	
	app.use(controllers);
	let time = +new Date()
	let port = Number(process.env.HTTP_PORT || 3030)
	await new Promise(resolve=>server.listen(port, ()=>resolve(true)))
	setlog(`Started HTTP service on port ${port}. ${+new Date()-time}ms`)
	time = +new Date()
	port = Number(process.env.HTTPS_PORT || 443)
	await new Promise(resolve=>httpsServer.listen(port, ()=>resolve(true)))
	setlog(`Started HTTPS service on port ${port}. ${+new Date()-time}ms`)
})