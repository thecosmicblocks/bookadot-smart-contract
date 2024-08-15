import { ethers, network } from 'hardhat'
import { makeId } from './../scripts/helpers';
import { generateBookingParam } from '../helpers/signature';
import { NATIVE_TOKEN } from '../helpers/consts';
import { BookadotProperty } from '../build/types/BookadotProperty';

async function main() {
    //////////// CONTRACT INSTANCE ////////////
    const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY!);
    const bookadotProperty = await ethers.getContractAt("BookadotProperty", "0xE4d8320D6f947F2B424Ce2a2fa9248d52a3e151B") as BookadotProperty;

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