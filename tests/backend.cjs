const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Sheet{
 constructor(rows){this.rows=rows;}
 getDataRange(){return {getValues:()=>this.rows.map(r=>[...r]),getDisplayValues:()=>this.rows.map(r=>r.map(v=>String(v??'')))};}
 getLastRow(){return this.rows.length;}
 getRange(row,col,height=1,width=1){return {setNumberFormat:()=>{},setValue:v=>{this.rows[row-1]??=[];this.rows[row-1][col-1]=v;},setValues:vs=>{vs.forEach((r,i)=>{this.rows[row-1+i]??=[];r.forEach((v,j)=>this.rows[row-1+i][col-1+j]=v);});},getValues:()=>this.rows.slice(row-1,row-1+height).map(r=>r.slice(col-1,col-1+width))};}
 appendRow(row){this.rows.push(row);} deleteRow(n){this.rows.splice(n-1,1);}
}
const sheets={Books:new Sheet([['id','title','author','category','rack','total','available','price','type']]),Members:new Sheet([['id','name','role','class','status']]),Transactions:new Sheet([['id','book','member','issue','due','return','fine','status','fineStatus']]),Settings:new Sheet([['Admin Password','testsecret']]),Categories:new Sheet([['Category','Prefix']])};
const cache=new Map();let locks=0,releases=0;
const ctx={console,SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n],insertSheet:n=>sheets[n]=new Sheet([])}),flush:()=>{}},CacheService:{getScriptCache:()=>({put:(k,v)=>cache.set(k,v),get:k=>cache.get(k),remove:k=>cache.delete(k)})},LockService:{getScriptLock:()=>({tryLock:()=>{locks++;return true;},releaseLock:()=>releases++})},Utilities:{getUuid:()=>require('crypto').randomUUID(),formatDate:d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../Code.gs'),'utf8'),ctx);
const call=(functionName,args=[],token)=>ctx.apiCall({functionName,args,token});
assert(!call('addNewBook',[{}]).success);
assert(!call('getSystemSettings_').success);
assert(!('password' in call('getSystemSettings').result));
assert(!call('authenticateAdmin',['wrong']).success);
const token=call('authenticateAdmin',['testsecret']).result.token;
const book=id=>({bookId:id,title:"Reader's <book>",author:'Author',category:'STUDY',totalCopies:2,type:'Issuable'});
assert(call('addNewBook',[book('001')],token).success);
assert(!call('addNewBook',[book('001')],token).success);
assert(call('addNewBook',[book('002')],token).success);
assert.equal(sheets.Books.rows[1][0],'001');
assert(!call('addNewBook',[{...book('003'),totalCopies:0}],token).success);
const member=id=>({memberId:id,name:"Aman's <name>",className:'2'});
assert(call('addNewMember',[member('S1')],token).success);
assert(call('addNewMember',[member('S2')],token).success);
assert(!call('addNewMember',[member('S1')],token).success);
assert(call('issueBookToStudent',['001','S1',false],token).success);
assert.equal(call('getAllBooks').result.find(b=>b.id==='001').available,1);
assert(!call('updateBookDetails',['001',{title:'Invalid',category:'STUDY',totalCopies:0}],token).success);
assert.equal(sheets.Books.rows[1][1],"Reader's <book>");
assert(!call('deleteBook',['001'],token).success);
assert(!call('deleteMember',['S1'],token).success);
assert(call('deleteBook',['002'],token).success);
assert(call('deleteMember',['S2'],token).success);
assert(!call('deleteBook',['002'],token).success);
const d=ctx.parseLibraryDate_('04/10/2026');assert.equal(d.getMonth(),9);assert.equal(d.getDate(),4);
assert(call('returnBookFromStudent',['001','S1'],token).success);
assert.equal(call('getAllBooks').result.find(b=>b.id==='001').available,2);
assert(!call('deleteBook',['001'],token).success);
assert(call('updateSystemSettings',[21,2,''],token).success);
assert.equal(ctx.getSystemSettings_().password,'testsecret');
assert(call('validateSession',[],token).success);
call('logoutAdmin',[],token);assert(!call('validateSession',[],token).success);
assert.equal(locks,releases);
console.log('Backend regression scenarios passed (mock Apps Script services).');
