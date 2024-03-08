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
    socket.on('message',function(message){
        log('S-->Got message',message)
        socket.broadcast.to(message.channel).emit('message',message.message)
    })

    socket.on('create or join',function(channel){
        var numClients=io.sockets.adapter.rooms.get(channel)?.size || 0
        console.log('numclients='+numClients)

        if(numClients===0){
            socket.join(channel)
            socket.emit('created',channel)
        }
        else if(numClients===1){
            io.sockets.in(channel).emit('remotePeerJoining',channel)
            socket.join(channel)
            socket.broadcast.to(channel).emit('broadcast:joined','S-->broadcast():client '+socket.id + 'joined channel'+channel)
        }
        else{
            console.log("channel full")
            socket.emit('full',channel)
        }
    })

    socket.on('response',function(response){
        log('S-->Got response:',response)
        socket.broadcast.to(response.channel).emit('response',response.message)
    })

    socket.on('Bye',function(channel){
        socket.broadcast.to(channel).emit('Bye')
        socket.disconnect()
    })

    socket.on('Ack',function(){
        console.log('Got an Ack')
        socket.disconnect()
    })

    function log(){
        var array=[">>> "]
        for(var i=0;i<arguments.length;i++){
            array.push(arguments[i])
        }
        socket.emit('log',array)
    }
})


app.listen(6001, () => {
    console.log("Server is running on port 6001");
  });
server.listen(8001,()=>{
    console.log("socket server is running on 8001")
})