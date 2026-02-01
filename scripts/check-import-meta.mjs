// Test what import.meta.env looks like in an is:inline script context

const testHTML = `
<!DOCTYPE html>
<html>
<head>
  <script>
    // Simulating is:inline script
    console.log('typeof import:', typeof import);
    console.log('import:', typeof import !== 'undefined' ? import : 'undefined');

    try {
      console.log('import.meta:', import.meta);
    } catch (e) {
      console.log('ERROR accessing import.meta:', e.message);
    }

    try {
      console.log('import.meta.env:', import.meta.env);
    } catch (e) {
      console.log('ERROR accessing import.meta.env:', e.message);
    }

    try {
      const isDev = import.meta.env.DEV;
      console.log('import.meta.env.DEV:', isDev);
    } catch (e) {
      console.log('ERROR accessing import.meta.env.DEV:', e.message);
    }
  </script>
</head>
<body>
</body>
</html>
`;

console.log('Test HTML created. Open in browser to see results.');
console.log('Expected: import.meta is NOT available in inline scripts');
console.log('This causes the DEV checks in BasicScripts.astro to FAIL SILENTLY or ERROR');
