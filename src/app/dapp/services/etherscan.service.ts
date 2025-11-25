import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { Transaction } from '../interfaces/transaction.interface';
import { NETWORKS } from '../config/constants';

@Injectable({
  providedIn: 'root'
})
export class EtherscanService {
  private apiKey = 'SWUFCXSWKHF9W8BS8PDYT1KT783KJD36X4'; // Tu API key de Etherscan
  private baseUrls = {
    1: 'https://api.etherscan.io/api',
    11155111: 'https://api-sepolia.etherscan.io/api',
    137: 'https://api.polygonscan.com/api',
    80001: 'https://api-mumbai.polygonscan.com/api',
    17000: 'https://api-holesky.etherscan.io/api'
  };

  constructor(private http: HttpClient) { }

  getTransactionHistory(address: string, chainId: number): Observable<Transaction[]> {
    const baseUrl = this.getBaseUrlForChain(chainId);

    if (!baseUrl) {
      console.error('Red no soportada para consulta de transacciones');
      return of([]);
    }

    // Construir URL para obtener las transacciones normales (enviadas)
    const url = `${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${this.apiKey}`;

    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.status === '1' && response.result) {
          return this.processTransactions(response.result, address);
        } else {
          console.error('Error al obtener transacciones:', response.message);
          return [];
        }
      }),
      catchError(error => {
        console.error('Error en la solicitud a Etherscan:', error);
        return of([]);
      })
    );
  }

  private processTransactions(txs: any[], address: string): Transaction[] {
    // Filtrar y mapear las transacciones a nuestro formato
    return txs.slice(0, 50).map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      status: tx.txreceipt_status === '1' ? 'confirmed' :
              tx.txreceipt_status === '0' ? 'failed' : 'pending',
      timestamp: parseInt(tx.timeStamp) * 1000, // Convertir a milisegundos
      isOutgoing: tx.from.toLowerCase() === address.toLowerCase(),
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice
    }));
  }

  private getBaseUrlForChain(chainId: number): string | null {
    return this.baseUrls[chainId as keyof typeof this.baseUrls] || null;
  }

  getExplorerUrl(chainId: number, hash: string): string {
    const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
    if (network && network.blockExplorer) {
      return `${network.blockExplorer}/tx/${hash}`;
    }
    return '#';
  }
}
