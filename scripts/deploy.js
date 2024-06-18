require('colors');
const fs = require('fs');
const json = require("../artifacts/contracts/Airdrop.sol/Airdrop.json");
const config = require('../src/config/config.json')
const hre = require('hardhat')
const name = hre.network.name

async function main() {
	const signer = await ethers.getSigner();
	const network = await signer.provider._networkPromise;
	const chainId = network.chainId;
	const {url, blockTime} = hre.network.config
	const Contract = await ethers.getContractFactory("Airdrop");
	const contract = await Contract.deploy();
	console.log('\t'+name+'\t' + contract.address.green);

	/* console.log('writing abis and addresses...'.blue); */
	/* -------------- writing... -----------------*/
	fs.writeFileSync(`./src/config/config.json`, JSON.stringify({...config, [name]: {airdrop:contract.address, url, chainId, blockTime}}, null, 4));
	fs.writeFileSync(`./src/config/abi.json`, JSON.stringify(json.abi, null, 4));
}

main().then(() => {
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
