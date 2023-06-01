import { readFile } from "fs/promises";
import { Markov, MarkovData } from "kurwov";

const main = async () => {
  const messages = await readFile("messages.json", { encoding: "utf-8" }).then(
    (t) => JSON.parse(t) as string[]
  );

  const markovData = new MarkovData(messages);

  for (let i = 1; i <= 20; i++) {
    if (process.argv.length !== 3) {
      console.log(Markov.generate({ data: markovData }));
    } else {
      console.log(
        Markov.complete({ data: markovData, start: process.argv[2] })
      );
    }
  }
};

main();
