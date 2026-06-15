const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add the helper function if it doesn't exist
    if (!content.includes('const getTeamId')) {
      const helper = `\nconst getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);\n`;
      content = content.replace(/(const router = express\.Router\(\);[\s\S]*?router\.use\(.*?\);)/, `$1\n${helper}`);
    }
    
    // Replace all req.user.teamId with getTeamId(req)
    // Wait, in some routes auth middleware is NOT at the top or there's no router.use()
    // Let's just do a simple string replace for req.user.teamId
    
    // If we use string replace to `(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))` 
    // it's safer and doesn't require injecting a helper function.
    
    const replacement = `(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))`;
    content = content.split('req.user.teamId').join(replacement);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
