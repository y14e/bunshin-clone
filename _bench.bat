cd /d %~dp0
bun tsup & ^
npm i tsx bunshin-clone-npm@npm:bunshin-clone tinybench lodash.clonedeep @types/lodash.clonedeep rfdc klona & ^
npx tsx ./benchmark/run.ts & ^
cmd /k npm un tsx bunshin-clone-npm tinybench lodash.clonedeep @types/lodash.clonedeep rfdc klona