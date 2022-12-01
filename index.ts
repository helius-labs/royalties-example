import axios from "axios";
import { getEnv } from "./utils";

// We expect the provided signature to be for an NFT_SALE event.
async function checkRoyaltyPayments(signature: string) {
  const apiKey = getEnv("API_KEY");

  // Parse transaction and extract NFT event.
  const txn = await parseTxn(signature, apiKey);
  const nftEvent = txn.events.nft;
  const nft = nftEvent.nfts[0];
  console.log(`NFT ${nft.mint} was purchased. Checking royalties.`);

  // Get NFT metadata for the purchased NFT.
  const metadata = await getNftMetadata(nft.mint, apiKey);
  const creators = metadata.onChainData.data.creators;
  const royaltyBips = metadata.onChainData.data.sellerFeeBasisPoints;
  const expectedPayment = nftEvent.amount * (royaltyBips / 1000);
  console.log(
    `Expecting royalty payment of ${expectedPayment} for the NFT sale.`
  );

  // Look over creators and check royalty payments.
  for (const creator of creators) {
    if (creator.share > 0) {
      const royaltyPayment = txn.nativeTransfers
        .filter((t: any) => t.toUserAccount === creator.address)
        .map((t: any) => t.amount);
      if (royaltyPayment !== undefined) {
        const expectedShare = (creator.share / 100) * royaltyPayment;
        console.log(
          `${royaltyPayment}/${expectedShare} of royalty paid for ${creator.address}.`
        );
      } else {
        `No royalty paid for ${creator.address}.`;
      }
    }
  }
}

async function parseTxn(signature: string, apiKey: string) {
  const { data } = await axios.post(
    `https://api.helius.xyz/v0/transactions?api-key=${apiKey}`,
    {
      transactions: [signature],
    }
  );
  return data[0];
}

async function getNftMetadata(mint: string, apiKey: string) {
  const { data } = await axios.post(
    `https://api.helius.xyz/v0/tokens/metadata?api-key=${apiKey}`,
    {
      mintAccounts: [mint],
    }
  );
  return data[0];
}

function getArgs() {
  const args = require("minimist")(process.argv.slice(2));
  const signature = args.signature as string;
  return {
    signature,
  };
}

async function main() {
  const { signature } = getArgs();
  if (!signature) {
    console.error(
      "Please provide a signature (e.g. `npm run app -- --signature=<...>`"
    );
  }
  await checkRoyaltyPayments(signature);
}

main();
