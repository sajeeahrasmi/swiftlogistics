import React, { useEffect, useState } from 'react';
import { getBillingInfo, getInvoices } from '../../api';

const BillingDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const runDebug = async () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      console.log('🧪 BILLING DEBUG START');
      
      const debug: any = {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'No token',
        hasUser: !!user,
        userInfo: user ? JSON.parse(user) : null,
        timestamp: new Date().toISOString()
      };
      
      console.log('🔍 Debug info:', debug);
      
      // Test API calls
      try {
        console.log('🧪 Testing getBillingInfo...');
        const billingResult = await getBillingInfo();
        debug.billingSuccess = true;
        debug.billingData = billingResult;
        console.log('✅ Billing API success');
      } catch (error: any) {
        debug.billingSuccess = false;
        debug.billingError = error.message;
        console.error('❌ Billing API failed:', error);
      }

      try {
        console.log('🧪 Testing getInvoices...');
        const invoicesResult = await getInvoices();
        debug.invoicesSuccess = true;
        debug.invoicesCount = invoicesResult?.data?.length || 0;
        console.log('✅ Invoices API success');
      } catch (error: any) {
        debug.invoicesSuccess = false;
        debug.invoicesError = error.message;
        console.error('❌ Invoices API failed:', error);
      }
      
      setDebugInfo(debug);
      console.log('🧪 BILLING DEBUG END');
    };

    runDebug();
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Billing Debug Information</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Authentication Status</h2>
            <div className="space-y-2 text-sm">
              <div>Token Present: <span className={debugInfo.hasToken ? 'text-green-600' : 'text-red-600'}>{debugInfo.hasToken ? 'YES' : 'NO'}</span></div>
              <div>Token Length: {debugInfo.tokenLength}</div>
              <div>Token Preview: <code className="text-xs">{debugInfo.tokenPreview}</code></div>
              <div>User Data: <span className={debugInfo.hasUser ? 'text-green-600' : 'text-red-600'}>{debugInfo.hasUser ? 'YES' : 'NO'}</span></div>
              {debugInfo.userInfo && (
                <div>User Email: {debugInfo.userInfo.email}</div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">API Test Results</h2>
            <div className="space-y-2 text-sm">
              <div>Billing API: <span className={debugInfo.billingSuccess ? 'text-green-600' : 'text-red-600'}>{debugInfo.billingSuccess ? 'SUCCESS' : 'FAILED'}</span></div>
              {debugInfo.billingError && <div className="text-red-600">Error: {debugInfo.billingError}</div>}
              {debugInfo.billingData && <div>Balance: LKR {debugInfo.billingData.data?.total_balance?.toLocaleString()}</div>}
              
              <div>Invoices API: <span className={debugInfo.invoicesSuccess ? 'text-green-600' : 'text-red-600'}>{debugInfo.invoicesSuccess ? 'SUCCESS' : 'FAILED'}</span></div>
              {debugInfo.invoicesError && <div className="text-red-600">Error: {debugInfo.invoicesError}</div>}
              {debugInfo.invoicesCount && <div>Invoice Count: {debugInfo.invoicesCount}</div>}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Raw Debug Data</h2>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Refresh Debug
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingDebug;