import { ethers, network } from 'hardhat'
import { makeId } from './../scripts/helpers';
import { generateBookingParam } from '../helpers/signature';
import { NATIVE_TOKEN } from '../helpers/consts';
import { BookadotProperty } from '../build/types/BookadotProperty';

async function main() {
    //////////// CONTRACT INSTANCE ////////////
    const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY!);
    const bookadotProperty = await ethers.getContractAt("BookadotProperty", "0xb7Ce118f34A73f0d627617d6Cc2FC254b747Be7f") as BookadotProperty;

    ////////////////////////
    ////////////////////////
    //////////// PARAM ////////////
    const bookingId = makeId(10, 'string') as string
    const bookingAmount = ethers.utils.parseEther('0.0001')
    let { param, signature } = await generateBookingParam(
        bookingId, bookingAmount, signer, NATIVE_TOKEN, {
        chainId: network.config.chainId,
        bookadotPropertyAddress: bookadotProperty.address,
    })
    let bookingTx = await bookadotProperty.book(param, signature, { value: bookingAmount })
    bookingTx.wait()
    console.log('tx:', bookingTx.hash);

}


main()