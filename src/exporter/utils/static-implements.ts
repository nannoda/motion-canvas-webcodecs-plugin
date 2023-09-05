// Static Impeliments
// https://stackoverflow.com/questions/41336858/how-to-define-static-methods-in-typescript-interface
/* class decorator */
function staticImplements<T>() {
  return <U extends T>(constructor: U) => {constructor};
}