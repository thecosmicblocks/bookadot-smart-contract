import { ethers } from "hardhat";
import "dotenv/config";
import Configs from './configs.json';

async function main() {
    const BookadotLensContract = await ethers.getContractFactory("BookadotLens");

    const [deployer] = await ethers.getSigners();

    const bookadotLensContract = BookadotLensContract.attach(Configs.bookadot_lens.address);
    await Promise.all([
        bookadotLensContract.deployed(),
    ])

    console.log('Setting attestor...');
    const attestor = Configs.bookadot_lens.attestor || deployer.address;
    await bookadotLensContract.connect(deployer).setAttestor(attestor); // change this to the identity of your ActionOffchainRollup found in your Phala Oracle deployment labeled 'Oracle Endpoint'
    console.log(`🚨NOTE🚨\nMake sure to set the Consumer Contract Address in your Phat Contract 2.0 UI dashboard (https://bricks.phala.network)\n- Go to the 'Configuration' tab and update the 'Client' box\n- Set value to ${bookadotLensContract.address}`)
    console.log('Done');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
