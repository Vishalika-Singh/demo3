const { exec } = require('child_process');

// Command to start your React application using react-scripts
const command = 'npm start';

// Execute the command using child_process.exec
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error starting React application: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});
