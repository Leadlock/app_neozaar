const graphSend=require("../../../utils/sendEmailAzure");
const providers={graph:{async send(message){const ok=await graphSend(message.to,message.subject,message.html||message.text,Boolean(message.html),message.fromEmail,message.fromName,{replyTo:message.replyTo,headers:message.headers});if(!ok)throw new Error("Email provider rejected the message");return{provider:"graph"};}}};
async function send(providerType,message){const provider=providers[providerType];if(!provider)throw new Error(`Unsupported email provider: ${providerType}`);return provider.send(message);}
module.exports={send};
