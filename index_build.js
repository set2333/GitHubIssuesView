const express = require('express');

const app = express();
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res)=>{
    res.sendFile(__dirname + '/index_build.html');
});

app.listen(8080, ()=>{
    console.log('Что-то менял? Не забудь выполнить NPM RUN BUILD!!!');
    console.log('Server started...');
});