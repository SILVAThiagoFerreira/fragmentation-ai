# Enaex Fragmentation AI

Aplicação estática para leitura indicativa de fragmentação em ortofotos de
pilhas e frentes de mina. Todo o processamento acontece no navegador.

## Fluxo

1. Carregue uma ortofoto PNG, JPG, WEBP ou TIFF.
2. Confira ou desenhe o polígono da área a analisar.
3. Informe a escala estimada em milímetros por pixel **nativo** da ortofoto. A análise roda em uma versão reduzida (até 1500 px no maior lado); a escala é convertida automaticamente para o pixel analisado (`effectiveMmPerPixel` em `src/analysis.js`).
4. Execute a leitura e confira D10, D50, D80, finos, curva e tabela passante.
5. Exporte a distribuição em CSV ou gere uma versão para impressão/PDF.

O motor atual é uma triagem visual baseada em contraste e textura. Ele foi
preparado para receber a ortofoto específica da pilha e deve ser calibrado com
uma medida conhecida e confirmado por amostragem de campo antes de decisões
operacionais.

## Desenvolvimento

```bash
npm install
npm run dev
```

Validação local:

```bash
npm test
npm run build
```
