/**
 * OpenDistributedFileStorage
 * Copyright (C) 2024 Amir Czwink (amir130@hotmail.de)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * */

import amqp from 'amqplib/callback_api';

import { Injectable } from "acts-util-node";
import { CONFIG_RMQ } from '../env';

@Injectable
export class MessagingService
{
    constructor()
    {
        amqp.connect({
            hostname: CONFIG_RMQ.host,
            protocol: "amqp",
            vhost: "OpenDistributedFileStorage",
        }, (error0, connection) =>
        {
            if (error0)
                throw error0;
            this.connection = connection;
        });
    }

    //Public methods
    public Close()
    {
        this.connection.close();
    }

    public ListenForMessages(queue: string, messageHandler: (msg: string) => Promise<void>)
    {
        this.connection.createChannel(function(error1, channel)
        {
            if (error1)
                throw error1;

            channel.prefetch(1);
            channel.consume(queue, async function(msg)
            {
                if(msg !== null)
                {
                    await messageHandler(msg.content.toString("utf-8"));
                    channel.ack(msg!);
                }
            }, {
                noAck: false
            });
        });
    }

    public Publish(exchange: string, msg: string)
    {
        this.connection.createChannel(function(error1, channel)
        {
            if (error1)
                throw error1;

            channel.publish(exchange, "", Buffer.from(msg));
        });
    }

    //State
    private connection!: amqp.Connection;
}