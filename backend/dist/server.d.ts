import express from 'express';
import { SecureDatabase } from './database-v2';
export declare class TaskFlowServer {
    private app;
    private server;
    private db;
    private config;
    constructor(config?: any);
    private initializeMiddleware;
    private initializeRoutes;
    private initializeErrorHandling;
    private generateSelfSignedCert;
    start(): Promise<void>;
    shutdown(): Promise<void>;
    getApp(): express.Application;
    getDatabase(): SecureDatabase;
}
