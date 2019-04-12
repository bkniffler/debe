const generate = require('node-chartist');
const inlineCss = require('inline-css');
import { readFile } from 'fs';
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

export async function chartist(type: string, options: any, data: any) {
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
  return [svg, html];
}
