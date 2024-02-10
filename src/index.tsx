import data from './data.json';

export type Fonts = typeof data;
export type FontNames = keyof Fonts;
export type FontWeights<Name extends FontNames> = keyof Fonts[Name];

export function multiply(a: number, b: number): Promise<number> {
  return Promise.resolve(a * b);
}
