import zadarma from 'zadarma-api';
const api = new zadarma.Api('024313c8754644aa8b4e', '2ab3b0663c1bc16650c7');
api.getPbxInternal().then(res => console.log(JSON.stringify(res))).catch(console.error);
