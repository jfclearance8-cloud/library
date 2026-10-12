const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const s=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const a=s.indexOf('        function bookPrefix('),b=s.indexOf('        function viewBookHistory(',a),c={};
vm.createContext(c);vm.runInContext(s.slice(a,b),c);
for(const [title,query] of [['ഞാൻ','njan'],['പുസ്തകം','pusthakam'],['മലയാളം','malayalam'],['ഖസാക്കിന്റെ ഇതിഹാസം','khasakkinte'],['എന്റെ ലോകം','ente lokam']]) assert(c.matchesBook({id:'AB001',title,author:'',category:''},query),title+' / '+query);
assert(c.matchesBook({id:'AD001',title:'Book'},'ad'));
assert.equal(c.bookPrefix('ab 002'),'AB');
assert(!c.matchesBook({id:'AB001',title:'Book'},'zzzzz'));
console.log('Manglish variants and case-insensitive book code checks passed.');
