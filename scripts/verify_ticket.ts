import '@nomiclabs/hardhat-ethers'
import hre from 'hardhat'

async function main() {
    await hre.run('verify:verify', {
        address: '0x0a271EE753DA327C828225Dc656297E8bb6f9c2f',
        constructorArguments: [
            "Bookadot First Event", // _nftName
            "BFE",  // _nftSymbol
            "https://www.example.com/", // _baseUri
            "0xA5125577129778127b1336386D80Da48f8475E14", // _owner
            "0xA5125577129778127b1336386D80Da48f8475E14", // _transferable
            "0x6BCf2e542569F938117A3Ed07A5fD4996e62fcF8", // _operator 
        ],
    })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
