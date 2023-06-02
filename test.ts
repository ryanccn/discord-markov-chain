import { Markov, MarkovData } from "kurwov";
import { readMessages } from "./lib";

const main = async () => {
  const messages = await readMessages(process.argv[2]);

  const markovData = new MarkovData(messages);

  for (let i = 1; i <= 20; i++) {
    console.log(Markov.generate({ data: markovData }));
  }
};

main();
