require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('hardhat-deploy');
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
	const accounts = await hre.ethers.getSigners();

	for (const account of accounts) {
		console.log(account.address);
	}
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
	networks: {
		ganache :{
			blockTime:1,
			url: "http://192.168.115.160:7545",
			accounts: [process.env.PRIVATEKEY]
		},

		ropsten :{
			blockTime:1,
			url: "http://192.168.115.160:7545",
			accounts: [process.env.PRIVATEKEY]
		},
		rinkeby :{
			blockTime:1,
			url: "http://192.168.115.160:7545",
			accounts: [process.env.PRIVATEKEY]
		},
		kovan :{
			blockTime:1,
			url: "http://192.168.115.160:7545",
			accounts: [process.env.PRIVATEKEY]
		},
		bsc: {
			blockTime:1,
			url: "https://rpc.testnet.fantom.network",
			accounts: [process.env.PRIVATEKEY]
		},
		heco: {
			blockTime:1,
			url: "https://rpc.testnet.fantom.network",
			accounts: [process.env.PRIVATEKEY]
		},
		fantom: {
			blockTime:1,
			url: "https://rpc.testnet.fantom.network",
			accounts: [process.env.PRIVATEKEY]
		},
		sokol: {
			blockTime:17,
			url: "https://sokol.poa.network",
			accounts: [process.env.PRIVATEKEY]
		},
		mumbai: {
			blockTime:1,
			url: "https://rpc.testnet.fantom.network",
			accounts: [process.env.PRIVATEKEY]
		},
	},
	etherscan: {
		// Your API key for Etherscan
		// Obtain one at https://etherscan.io/
		apiKey: ""
	},
	solidity: {
		compilers: [
			{
				version: "0.8.6",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				}
			}
		]
	},
	mocha: {
		timeout: 20000
	}
};
