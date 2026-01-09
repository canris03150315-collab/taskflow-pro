#!/bin/sh
# Insert kick member notification logic after line 617

sed -i '617 a\
\
        // Notify removed members via WebSocket\
        try {\
            const removedMembers = currentParticipants.filter(id => !newParticipants.includes(id));\
            if (removedMembers.length > 0) {\
                const wsServer = req.app.get('\''wsServer'\'');\
                if (wsServer) {\
                    removedMembers.forEach(userId => {\
                        const client = wsServer.clients.get(userId);\
                        if (client && client.readyState === 1) {\
                            client.send(JSON.stringify({\
                                type: '\''kicked_from_channel'\'',\
                                payload: {\
                                    channelId: channelId,\
                                    message: '\''\\u4F60\\u5DF2\\u88AB\\u79FB\\u51FA\\u7FA4\\u7D44'\''\
                                }\
                            }));\
                        }\
                    });\
                    console.log(`\\u{1F6AB} \\u79FB\\u9664 ${removedMembers.length} \\u6210\\u54E1\\u5F9E\\u7FA4\\u7D44 ${channelId}`);\
                }\
            }\
        } catch (kickError) {\
            console.error('\''Kick notification error:'\'', kickError);\
        }' /app/dist/routes/chat.js

echo "SUCCESS: Kick logic inserted"
