import { useEffect, useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import * as blockchain from "@/lib/blockchain";
import type { SupportedAlgorithm } from "@/lib/crypto";

function App() {
  // Controls
  const [difficulty, setDifficulty] = useState(1);
  const [algorithm, setAlgorithm] = useState<SupportedAlgorithm>('SHA-256');

  // Editor
  const [transaction, setTransaction] = useState<string>('');

  // Data
  const [chain, setChain] = useState<Array<Readonly<blockchain.IBlock>>>([]);
  const [verification, setVerification] = useState<Array<{ blockId: number, ok: boolean }>>([]);

  // States
  const [isCalculating, setIsCalculating] = useState(true);

  // Create a genesis block on an initial load.
  useEffect(() => {
    blockchain.createGenesisBlock(algorithm, difficulty).then(gb => {
      setChain([gb]);
      setIsCalculating(false);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate the blockchain when the difficulty changes.
  useEffect(() => {
    let cancelled = false;

    const recalculate = async () => {
      setIsCalculating(true);

      // Capture transactions to preserve (excluding the genesis block at index 0)
      const transactionsToKeep = chain.slice(1).map(x => x.transaction);

      setChain([]);

      // Calculate genesis block first
      const genesisBlock = await blockchain.createGenesisBlock(algorithm, difficulty);
      if (cancelled) return;

      let currentChain = [genesisBlock];
      setChain(currentChain);

      // 3. Loop the rest of the blocks
      for (const transaction of transactionsToKeep) {
        if (cancelled) return;

        currentChain = await blockchain.addBlock(currentChain, transaction, algorithm, difficulty);
        setChain(currentChain);
      }

      setIsCalculating(false);
    };

    recalculate().catch(console.error);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, algorithm]);

  useEffect(() => {
    let isCancelled = false;

    const verify = async () => {
      setVerification([]);

      const result = await blockchain.validateChain(algorithm, chain);

      if (!isCancelled) {
        setVerification(result);
      }
    };

    verify().catch(console.error);

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain]);

  const verificationMap = useMemo(() => {
    const map = new Map();
    verification.forEach(v => map.set(v.blockId, v.ok));
    return map;
  }, [verification]);

  /**
   * Adds a new block to the blockchain using the provided chain, transaction, algorithm, and difficulty parameters.
   * Once the block is successfully added, updates the chain state and clears the transaction input.
   *
   * @async
   * @function addBlock
   * @returns {Promise<void>} Resolves when the block is successfully added and states are updated.
   */
  const addBlock = async (): Promise<void> => {
    setIsCalculating(true);

    const newChain = await blockchain.addBlock(chain, transaction, algorithm, difficulty);

    setChain(newChain);
    setTransaction('');
    setIsCalculating(false);
  }

  const randomlyBreakOne = () => {
    let selectedBlock = Math.floor(Math.random() * chain.length);

    // Do not pick the genesis block as the target to break.
    while (chain[selectedBlock].index === 0) {
      selectedBlock = Math.floor(Math.random() * chain.length);
    }

    const chainCopy = structuredClone(chain);
    chainCopy[selectedBlock] = {
      ...chainCopy[selectedBlock],
      transaction: "Oops! I broke this one",
    }

    setChain(chainCopy);
  }

  return (
    <div className="w-full grid grid-cols-[400px_auto] gap-4 p-4">
      <div>
        <Accordion className="w-full rounded-lg border mb-2" type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1" className="border-b px-4 last:border-b-0">
            <AccordionTrigger>Settings</AccordionTrigger>
            <AccordionContent>
              {/* Difficulty Changer */}
              <div className="grid w-full gap-3 mb-6">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="difficulty-slider">Difficulty</Label>
                  <span className="text-muted-foreground text-sm">{difficulty}</span>
                </div>
                <Slider
                  id="difficulty-slider"
                  value={[difficulty]}
                  onValueChange={value => setDifficulty(value[0])}
                  min={1}
                  max={4}
                  step={1}
                />
              </div>

              {/* Algorithm Changer */}
              <Field className="mb-2 w-full">
                <FieldLabel>Algorithm</FieldLabel>
                <Select value={algorithm} onValueChange={value => setAlgorithm(value as SupportedAlgorithm)}>
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Select an algorithm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="SHA-1">SHA-1 (Not recommended)</SelectItem>
                      <SelectItem value="SHA-256">SHA-256</SelectItem>
                      <SelectItem value="SHA-384">SHA-384</SelectItem>
                      <SelectItem value="SHA-512">SHA-512</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Field>
                  <FieldLabel>Randomly tamper one block</FieldLabel>
                  <Button onClick={randomlyBreakOne} className="bg-red-600 hover:bg-red-700">
                    Break one
                  </Button>
                </Field>
              </Field>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Accordion className="w-full rounded-lg border mb-2" type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1" className="border-b px-4 last:border-b-0">
            <AccordionTrigger>Add Block</AccordionTrigger>
            <AccordionContent>
              <Field className="mb-2 w-full">
                <FieldLabel htmlFor="transaction-input">Transaction</FieldLabel>
                <Input
                  id="transaction-input"
                  type="text"
                  value={transaction}
                  onChange={e => setTransaction(e.target.value)}
                />
              </Field>
              <Button
                disabled={transaction.length === 0}
                variant="outline"
                className="w-full"
                onClick={addBlock}
              >
                Add Transaction
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div>
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mb-4">
          Blocks
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {
            chain.map((x, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle>Block #{x.index}</CardTitle>
                  <CardDescription>{x.transaction}</CardDescription>
                  <CardAction>
                    {
                      verificationMap.get(x.index) === true ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="16" height="16" className="fill-green-600">
                          <path d="M6 0a6 6 0 1 1 0 12A6 6 0 0 1 6 0Zm-.705 8.737L9.63 4.403 8.392 3.166 5.295 6.263l-1.7-1.702L2.356 5.8l2.938 2.938Z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" className="fill-red-600">
                          <path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z"></path>
                        </svg>
                      )
                    }
                  </CardAction>
                </CardHeader>
                <CardContent className="overflow-hidden wrap-break-word whitespace-pre-wrap">
                  Hash:&nbsp;<span className="font-mono text-sm">{x.hash}</span><br />
                  Nonce:&nbsp;<span className="font-mono text-sm">{x.nonce}</span><br />
                </CardContent>
                <CardFooter>
                  <p className="mr-8">
                    Created on:<br />
                    <span className="font-mono text-sm">{new Date(x.timestamp).toLocaleString()}</span>
                  </p>
                  <p>
                    Duration:<br />
                    <span className="font-mono">{x.duration.toFixed(2)}ms</span>
                  </p>
                </CardFooter>
              </Card>
            ))
          }
          {
            isCalculating && (
              <Card>
                <CardHeader>
                  <CardTitle>Calculating Blocks...</CardTitle>
                  <CardAction>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" className="fill-blue-600">
                      <path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                    </svg>
                  </CardAction>
                </CardHeader>
              </Card>
            )
          }
        </div>
      </div>
    </div>
  );
}

export default App;
