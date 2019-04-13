const generate = require('node-chartist');
const inlineCss = require('inline-css');
const svg2img = require('svg2img');
import { readFile, writeFile } from 'fs';
import { resolve } from 'path';

const template = (html: string, css: string) => `
<html>
  <head>
    <style>
      ${css}
    </style>
  </head>
  <body>
    ${html}
  </body>
</html>
  `;

export async function chartist(
  type: string,
  options: any,
  data: any,
  output: string
) {
  const css: string = await new Promise((yay, nay) =>
    readFile(
      resolve(__dirname, 'styles.css'),
      { encoding: 'utf8' },
      (err, data) => (err ? nay(err) : yay(data))
    )
  );
  const chart = await generate(type, options, data);
  const html = await inlineCss(template(chart, css), { url: ' ' });
  const svg = html
    .split('<div class="ct-chart">')[1]
    .split('<div class="ct-legend">')[0];

  const buffer = await new Promise((yay, nay) =>
    svg2img(svg, (err: any, buffer: Buffer) => (err ? nay(err) : yay(buffer)))
  );
  await new Promise((yay, nay) =>
    writeFile(output, buffer, (err: any) => (err ? nay(err) : yay()))
  );
}
