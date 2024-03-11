const express = require("express");
const http = require("http");
const { Server } = require("socket.io");


const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors: {
      origin: 'http://127.0.0.1:5500'
    }
  });

io.sockets.on('connection',function(socket){
    socket.on('message',function (message){
        log('S --> got message: ', message);
        socket.broadcast.to(message.channel).emit('message', message.message);
    })

    socket.on('create or join',function(room){
        var numClients = io.sockets.adapter.rooms.get(room)?.size || 0
        log('S --> Room ' + room + ' has ' + numClients + ' client(s)');
        log('S --> Request to create or join room', room);

        if(numClients==0){
            socket.join(room)
            socket.emit('created',room)
        }else if(numClients==1){
            io.sockets.in(room).emit('join',room)
            socket.join(room)
            socket.emit('joined',room)
        }else{
            socket.emit('full',room)
        }
    })

    function log(){
        
        var array=[">>> "]
        for(var i=0;i<arguments.length;i++){
            array.push(arguments[i])
        }
        socket.emit('log',array)
    }
})

app.listen(8181, () => {
    console.log("Server is running on port 8181");
  });
server.listen(8001,()=>{
    console.log("socket server is running on 8001")
})