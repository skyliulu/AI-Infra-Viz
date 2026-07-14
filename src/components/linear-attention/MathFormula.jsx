import katex from 'katex';
import 'katex/dist/katex.min.css';

export function MathFormula({ children, block = false, className = '' }) {
  const html = katex.renderToString(children, {
    displayMode: block,
    throwOnError: false,
    strict: false,
    output: 'htmlAndMathml',
  });

  const Tag = block ? 'div' : 'span';
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
