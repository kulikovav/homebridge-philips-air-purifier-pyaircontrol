# Publishing Guide for Homebridge Philips Air Purifier Plugin

This guide covers how to publish your Homebridge plugin to npm for public installation.

## Prerequisites

Before publishing, ensure you have:

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com)
2. **npm CLI**: Install npm CLI globally: `npm install -g npm`
3. **Login**: Run `npm login` to authenticate with npm
4. **Repository**: Ensure your code is committed to a Git repository

## Pre-Publishing Checklist

### 1. Code Quality
- [ ] All tests pass: `npm run lint && npm run build`
- [ ] No TypeScript compilation errors
- [ ] ESLint passes with no warnings
- [ ] All functionality tested locally

### 2. Documentation
- [ ] README.md is complete and up-to-date
- [ ] Configuration examples are correct
- [ ] Installation instructions are clear
- [ ] Troubleshooting section is comprehensive

### 3. Package Configuration
- [ ] `package.json` has correct metadata
- [ ] Version number is appropriate
- [ ] All dependencies are correctly specified
- [ ] `engines` field specifies compatible versions
- [ ] `main` field points to correct entry point

### 4. Build Artifacts
- [ ] `dist/` directory contains compiled JavaScript
- [ ] Python scripts are included
- [ ] Virtual environment setup scripts are present
- [ ] No unnecessary files included

## Publishing Process

### Step 1: Prepare for Publishing

```bash
# Clean previous builds
npm run clean

# Build the project
npm run build

# Run tests
npm run lint
npm test

# Check what will be published
npm pack --dry-run
```

### Step 2: Update Version

Choose the appropriate version bump:

```bash
# Patch version (bug fixes)
npm version patch

# Minor version (new features)
npm version minor

# Major version (breaking changes)
npm version major
```

Or manually edit `package.json`:
```json
{
  "version": "1.1.0"
}
```

### Step 3: Publish to npm

```bash
# Publish to npm registry
npm publish

# Or publish with specific tag
npm publish --tag beta
npm publish --tag latest
```

### Step 4: Verify Publication

1. Check [npmjs.com](https://www.npmjs.com) for your package
2. Verify all files are included correctly
3. Test installation: `npm install -g your-package-name`

## Package Configuration

### Essential package.json Fields

```json
{
  "name": "homebridge-philips-air-purifier-pyaircontrol",
  "version": "1.0.0",
  "description": "Homebridge plugin for Philips Air Purifiers using py-air-control",
  "main": "dist/index.js",
  "files": [
    "dist/",
    "python_scripts/",
    "scripts/",
    "config.schema.json",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "homebridge": ">=1.6.0",
    "node": ">=16.0.0"
  },
  "keywords": [
    "homebridge",
    "philips",
    "air purifier",
    "py-air-control",
    "homekit"
  ],
  "author": "Your Name",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "git://github.com/your-username/homebridge-philips-air-purifier-pyaircontrol.git"
  }
}
```

### Files to Include

The `files` field in `package.json` should include:
- `dist/` - Compiled TypeScript output
- `python_scripts/` - Python scripts and setup files
- `scripts/` - Node.js scripts (postinstall)
- `config.schema.json` - Homebridge configuration schema
- `README.md` - Documentation
- `LICENSE` - License file

### Files to Exclude

Ensure these are in `.gitignore` and not published:
- `src/` - TypeScript source files
- `node_modules/` - Dependencies
- `python_venv/` - Virtual environment (created during install)
- `.git/` - Git metadata
- Development configuration files

## Version Management

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH**
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Version Tags

Use npm tags for different release types:

```bash
# Latest stable release
npm publish --tag latest

# Beta/RC releases
npm publish --tag beta
npm publish --tag rc

# Legacy versions
npm publish --tag legacy
```

## Publishing Scripts

### Automated Publishing

Create a publishing script in `package.json`:

```json
{
  "scripts": {
    "prepublishOnly": "npm run lint && npm run build",
    "publish:patch": "npm version patch && npm publish",
    "publish:minor": "npm version minor && npm publish",
    "publish:major": "npm version major && npm publish"
  }
}
```

### Pre-Publishing Hooks

The `prepublishOnly` script ensures:
- Code is linted
- TypeScript compiles successfully
- Build artifacts are created

## Testing Before Publishing

### Local Testing

```bash
# Test the build
npm run build

# Test installation locally
npm pack
npm install -g ./homebridge-philips-air-purifier-pyaircontrol-1.0.0.tgz

# Test functionality
# Verify Python scripts work
# Test Homebridge integration
```

### Dry Run Publishing

```bash
# See what would be published
npm pack --dry-run

# Check package contents
tar -tzf homebridge-philips-air-purifier-pyaircontrol-1.0.0.tgz
```

## Post-Publishing

### 1. Update Documentation

- Update version numbers in README
- Add changelog entries
- Update installation instructions if needed

### 2. Create Release

- Create a Git tag: `git tag v1.0.0`
- Push tag: `git push origin v1.0.0`
- Create GitHub release with changelog

### 3. Monitor Installation

- Check npm download statistics
- Monitor for installation issues
- Respond to user feedback

## Troubleshooting

### Common Publishing Issues

1. **Package Already Exists**
   - Check if you're logged in to the correct npm account
   - Verify package name uniqueness

2. **Build Failures**
   - Ensure all dependencies are installed
   - Check TypeScript compilation
   - Verify build scripts work locally

3. **Missing Files**
   - Check `files` field in `package.json`
   - Verify `.npmignore` doesn't exclude needed files
   - Test with `npm pack --dry-run`

4. **Permission Errors**
   - Ensure you're logged in: `npm whoami`
   - Check package ownership: `npm owner ls`
   - Contact package owner if needed

### Rollback Strategy

If a bad version is published:

```bash
# Unpublish (within 72 hours)
npm unpublish homebridge-philips-air-purifier-pyaircontrol@1.0.0

# Or deprecate
npm deprecate homebridge-philips-air-purifier-pyaircontrol@1.0.0 "Use version 1.0.1 instead"
```

## Best Practices

### 1. Release Frequency
- Release patches for bug fixes promptly
- Release minors for new features monthly
- Release majors only for breaking changes

### 2. Quality Assurance
- Always test locally before publishing
- Use CI/CD for automated testing
- Maintain comprehensive test coverage

### 3. Documentation
- Keep README updated with each release
- Maintain changelog
- Provide clear upgrade instructions

### 4. User Support
- Monitor npm and GitHub issues
- Respond to user questions promptly
- Provide troubleshooting guidance

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Publish to npm
on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## Support and Maintenance

### Long-term Maintenance

1. **Regular Updates**: Keep dependencies updated
2. **Security Patches**: Monitor for security vulnerabilities
3. **User Feedback**: Incorporate user suggestions
4. **Compatibility**: Test with new Homebridge versions

### Deprecation Policy

When deprecating features:
1. Mark as deprecated in documentation
2. Provide migration path
3. Give users time to adapt
4. Remove in next major version

---

**Remember**: Publishing to npm makes your plugin available to the entire Homebridge community. Ensure quality and provide excellent user support!
