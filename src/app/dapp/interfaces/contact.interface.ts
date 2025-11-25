// src/app/dapp/interfaces/contact.interface.ts
export interface Contact {
    id: string;
    name: string;
    address: string;
    notes?: string;
    createdAt: Date;
}
