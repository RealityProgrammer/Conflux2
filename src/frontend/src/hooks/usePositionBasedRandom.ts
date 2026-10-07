import {useId} from "react";
import {hash} from "../utils/hashing.ts";
import {mulberry32} from "../utils/random.ts";

// Return a random number greater and equal to 0 and less than 1 depend on the component position on the component tree.
export default function usePositionBasedRandom(): number {
  const id = useId();
  const seed = hash(id);

  return mulberry32(seed);
}