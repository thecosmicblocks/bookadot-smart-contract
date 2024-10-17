import * as dotenv from 'dotenv'
dotenv.config()

import { HardhatUserConfig } from 'hardhat/types'
import { task } from 'hardhat/config'
import '@nomiclabs/hardhat-etherscan'

// Plugins

import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import 'hardhat-abi-exporter'
import 'hardhat-gas-reporter'
import 'hardhat-contract-sizer'
import '@tenderly/hardhat-tenderly'
import '@openzeppelin/hardhat-upgrades'
import '@typechain/hardhat'
import 'solidity-coverage'
import "hardhat-watcher";

// Networks

interface NetworkConfig {
    network: string
    chainId: number
    gas?: number | 'auto'
    gasPrice?: number | 'auto'
}

const networkConfigs: NetworkConfig[] = [
    { network: 'eth-mainnet', chainId: 1 },
    { network: 'moonbaseAlpha', chainId: 1287 },
]

function getAccountPrivateKey() {
    return process.env.DEPLOYER_PRIVATE_KEY || ''
}

function getDefaultProviderURL(network: string) {
    switch (network) {
        case 'moonbaseAlpha':
            return 'https://rpc.api.moonbase.moonbeam.network'
        default:
            return `https://${network}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    }

}

function setupDefaultNetworkProviders(buidlerConfig) {
    for (const netConfig of networkConfigs) {
        buidlerConfig.networks[netConfig.network] = {
            chainId: netConfig.chainId,
            url: getDefaultProviderURL(netConfig.network),
            gas: netConfig.gasPrice || 'auto',
            gasPrice: netConfig.gasPrice || 'auto',
            // accounts: {
            //   mnemonic: getAccountMnemonic(),
            // },
            accounts: [getAccountPrivateKey()],
        }
    }
}

// Tasks

task('accounts', 'Prints the list of accounts', async (taskArgs, bre) => {
    const accounts = await bre.ethers.getSigners()
    for (const account of accounts) {
        console.log(await account.getAddress())
    }
})

// Config

const config: HardhatUserConfig = {
    paths: {
        sources: './contracts',
        tests: './test',
        artifacts: './build/contracts',
    },
    solidity: {
        compilers: [
            {
                version: '0.8.7',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1,
                    },
                    outputSelection: {
                        '*': {
                            '*': ['storageLayout'],
                        },
                    },
                },
            },
        ],
    },
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            chainId: 1337,
            loggingEnabled: false,
            gas: 12000000,
            gasPrice: 'auto',
            blockGasLimit: 12000000,
            accounts: {
                mnemonic: '',
            },
        },
        ganache: {
            chainId: 1337,
            url: 'http://localhost:8545',
        },
    },
    etherscan: {
        apiKey: {
            moonbaseAlpha: process.env.MOONBEAM_SCAN_API_KEY,
            moonbeam: process.env.MOONBEAM_SCAN_API_KEY,
        }
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS ? true : false,
        showTimeSpent: true,
        currency: 'USD',
        outputFile: 'reports/gas-report.log',
    },
    typechain: {
        outDir: 'build/types',
        target: 'ethers-v5',
    },
    abiExporter: {
        path: './build/abis',
        clear: false,
        flat: true,
    },
    // tenderly: {
    //   project: process.env.TENDERLY_PROJECT,
    //   username: process.env.TENDERLY_USERNAME,
    // },
    contractSizer: {
        alphaSort: true,
        runOnCompile: false,
        disambiguatePaths: true,
    },
}

setupDefaultNetworkProviders(config)

export default config
