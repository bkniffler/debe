//@ts-ignore
import * as uuidv4 from 'uuid4';

export let _generate = uuidv4;
export function setIdGenerator(generator: () => string) {
  _generate = generator as any;
}
export function generate() {
  return _generate();
}
