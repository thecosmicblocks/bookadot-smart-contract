import { BookadotTicket__factory } from './build/types/factories/BookadotTicket__factory';
import { BookadotProperty__factory } from './build/types/factories/BookadotProperty__factory';
import { BookadotFactory } from './build/types/BookadotFactory';
import { BigNumber, BytesLike } from "ethers"
import Config from "./scripts/configs.json"
import * as hre from "hardhat";

const propertyId = BigNumber.from(2);

async function main() {
    const signer = await hre.ethers.getSigners();
    const hostAddress = signer[0].address;
    const ticketData = generateTicketData(
        propertyId.toNumber(),
        Config.bookadot_config.address,
        Config.bookadot_ticket_factory.address,
        hostAddress
    )

    const bookadotFactory = (await hre.ethers.getContractFactory("BookadotFactory", {
        libraries: {
            BookadotEIP712: Config.bookadot_eip712.address
        }
    })).attach(Config.bookadot_factory.address) as BookadotFactory;

    let deployPropertyTx = await bookadotFactory
        .deployProperty([propertyId], hostAddress, ticketData)
    let deployPropertyTxResult = await deployPropertyTx.wait()
    console.log(JSON.stringify(deployPropertyTxResult.events, null, 2));

    // const setTicketAddr = await bookadotProperty.connect(signers[2]).setTicketAddress(bookadotTicket.address);
    // await setTicketAddr.wait(1);
}

function generateTicketData(
    propertyId: number,
    configAddr: string,
    factoryAddr: string,
    hostAddress: string
): string {
    const salt = hre.ethers.utils.keccak256(hre.ethers.utils.arrayify(propertyId));

    const constructorArgsEncoded = hre.ethers.utils.defaultAbiCoder.encode(
        ["uint256", "address", "address", "address"],
        [propertyId, configAddr, factoryAddr, hostAddress]
    );
    const bookadotPropertyBytecode = `${BookadotProperty__factory.bytecode}${constructorArgsEncoded.slice(2)}`;
    const bookadotPropertyAddr = calculateCreate2Address(factoryAddr, [
        salt,
        bookadotPropertyBytecode
    ])

    const type = [
        'string', // _nftName
        'string', // _nftSymbol
        'string', // _baseUri
        'address', // _operator
        'address', // _owner
        'address', // _transferable
    ]

    const value = [
        "Bookadot First Event",
        "BFE",
        "https://www.example.com/",
        bookadotPropertyAddr,
        hre.ethers.constants.AddressZero,
        hre.ethers.constants.AddressZero,
    ]

    return hre.ethers.utils.defaultAbiCoder.encode(
        type,
        value
    )
}


function calculateCreate2Address(
    factoryAddress: string,
    [salt, bytecode]: [BytesLike, BytesLike]
): string {
    const create2Inputs = [
        factoryAddress, // sender's address
        salt, // salt
        hre.ethers.utils.keccak256(bytecode) // init code hash
    ];
    // @ts-ignore
    const create2Address = ethers.utils.getCreate2Address(...create2Inputs);
    return create2Address;
}

main();