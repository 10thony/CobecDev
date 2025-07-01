import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readKfcPointsData() {
  try {
    const filePath = path.join(__dirname, '..', 'kfcpoints.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading kfcpoints.json:', error.message);
    throw error;
  }
}

async function loadKfcToIndexedDB() {
  try {
    console.log('📖 Reading KFC points data...');
    const kfcPointsData = await readKfcPointsData();
    console.log(`Found ${kfcPointsData.length} KFC entries`);

    // Create a simple HTML file that will load the data into IndexedDB
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load KFC Data to IndexedDB</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        pre { background-color: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Load KFC Data to IndexedDB</h1>
    <div id="status"></div>
    <button onclick="loadData()">Load KFC Data to IndexedDB</button>
    <button onclick="checkData()">Check IndexedDB Data</button>
    <button onclick="clearData()">Clear IndexedDB Data</button>
    <div id="output"></div>

    <script>
        const kfcData = ${JSON.stringify(kfcPointsData, null, 2)};
        
        function showStatus(message, type = 'info') {
            const statusDiv = document.getElementById('status');
            statusDiv.innerHTML = \`<div class="status \${type}">\${message}</div>\`;
        }

        function showOutput(content) {
            const outputDiv = document.getElementById('output');
            outputDiv.innerHTML = \`<pre>\${JSON.stringify(content, null, 2)}</pre>\`;
        }

        async function loadData() {
            try {
                showStatus('Loading KFC data to IndexedDB...', 'info');
                
                // Open IndexedDB
                const request = indexedDB.open('workdemos', 1);
                
                request.onerror = () => {
                    showStatus('Error opening IndexedDB: ' + request.error, 'error');
                };
                
                request.onsuccess = () => {
                    const db = request.result;
                    
                    // Load KFC points
                    const kfcTransaction = db.transaction(['kfcpoints'], 'readwrite');
                    const kfcStore = kfcTransaction.objectStore('kfcpoints');
                    
                    let kfcSuccessCount = 0;
                    let kfcFailCount = 0;
                    
                    kfcData.forEach((entry, index) => {
                        const kfcEntry = {
                            ...entry,
                            _id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        
                        const addRequest = kfcStore.add(kfcEntry);
                        addRequest.onsuccess = () => {
                            kfcSuccessCount++;
                            console.log(\`✅ Added KFC entry: \${entry.name}\`);
                        };
                        addRequest.onerror = () => {
                            kfcFailCount++;
                            console.error(\`❌ Failed to add KFC entry: \${entry.name}\`, addRequest.error);
                        };
                    });
                    
                    // Load employees
                    const employeesTransaction = db.transaction(['employees'], 'readwrite');
                    const employeesStore = employeesTransaction.objectStore('employees');
                    
                    // Extract unique employee names
                    const employeeNames = [...new Set(kfcData.map(entry => entry.name))];
                    let employeeSuccessCount = 0;
                    let employeeFailCount = 0;
                    
                    employeeNames.forEach(name => {
                        const employee = {
                            _id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                            name: name,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        
                        const addRequest = employeesStore.add(employee);
                        addRequest.onsuccess = () => {
                            employeeSuccessCount++;
                            console.log(\`✅ Added employee: \${name}\`);
                        };
                        addRequest.onerror = () => {
                            employeeFailCount++;
                            console.error(\`❌ Failed to add employee: \${name}\`, addRequest.error);
                        };
                    });
                    
                    // Wait for transactions to complete
                    kfcTransaction.oncomplete = () => {
                        employeesTransaction.oncomplete = () => {
                            showStatus(\`✅ Successfully loaded data! KFC: \${kfcSuccessCount} success, \${kfcFailCount} failed. Employees: \${employeeSuccessCount} success, \${employeeFailCount} failed.\`, 'success');
                        };
                    };
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create collections (object stores)
                    if (!db.objectStoreNames.contains('kfcpoints')) {
                        const kfcStore = db.createObjectStore('kfcpoints', { keyPath: '_id', autoIncrement: true });
                        kfcStore.createIndex('name', 'name', { unique: true });
                    }

                    if (!db.objectStoreNames.contains('employees')) {
                        const employeesStore = db.createObjectStore('employees', { keyPath: '_id', autoIncrement: true });
                        employeesStore.createIndex('name', 'name', { unique: true });
                    }
                };
                
            } catch (error) {
                showStatus('Error loading data: ' + error.message, 'error');
            }
        }

        async function checkData() {
            try {
                showStatus('Checking IndexedDB data...', 'info');
                
                const request = indexedDB.open('workdemos', 1);
                
                request.onsuccess = () => {
                    const db = request.result;
                    
                    // Check KFC points
                    const kfcTransaction = db.transaction(['kfcpoints'], 'readonly');
                    const kfcStore = kfcTransaction.objectStore('kfcpoints');
                    const kfcRequest = kfcStore.getAll();
                    
                    // Check employees
                    const employeesTransaction = db.transaction(['employees'], 'readonly');
                    const employeesStore = employeesTransaction.objectStore('employees');
                    const employeesRequest = employeesStore.getAll();
                    
                    kfcRequest.onsuccess = () => {
                        employeesRequest.onsuccess = () => {
                            const result = {
                                kfcPoints: {
                                    count: kfcRequest.result.length,
                                    sample: kfcRequest.result.slice(0, 3)
                                },
                                employees: {
                                    count: employeesRequest.result.length,
                                    sample: employeesRequest.result.slice(0, 3)
                                }
                            };
                            
                            showStatus(\`📊 IndexedDB contains \${result.kfcPoints.count} KFC entries and \${result.employees.count} employees\`, 'success');
                            showOutput(result);
                        };
                    };
                };
                
            } catch (error) {
                showStatus('Error checking data: ' + error.message, 'error');
            }
        }

        async function clearData() {
            try {
                showStatus('Clearing IndexedDB data...', 'info');
                
                const request = indexedDB.deleteDatabase('workdemos');
                
                request.onsuccess = () => {
                    showStatus('✅ IndexedDB data cleared successfully!', 'success');
                };
                
                request.onerror = () => {
                    showStatus('❌ Error clearing data: ' + request.error, 'error');
                };
                
            } catch (error) {
                showStatus('Error clearing data: ' + error.message, 'error');
            }
        }
    </script>
</body>
</html>
    `;

    // Write the HTML file
    const outputPath = path.join(__dirname, '..', 'load-kfc-data.html');
    fs.writeFileSync(outputPath, htmlContent);
    
    console.log('✅ Created HTML file for loading KFC data to IndexedDB');
    console.log(`📁 File location: ${outputPath}`);
    console.log('\n📋 Instructions:');
    console.log('1. Open the HTML file in your browser');
    console.log('2. Click "Load KFC Data to IndexedDB" to populate the database');
    console.log('3. Click "Check IndexedDB Data" to verify the data was loaded');
    console.log('4. Refresh your KFC Management page to see the data');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run the script
loadKfcToIndexedDB().catch(console.error); 