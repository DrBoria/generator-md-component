"use strict";
import Generator from "yeoman-generator";
import chalk from "chalk";
import yosay from "yosay";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pkg from 'ncp';
const { ncp } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class extends Generator {
  prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the glorious ${chalk.red("generator-md-component")} generator!`
      )
    );

    // Read dependencies from ../../node_modules/md-turborepo/apps/docs/dependencies.json
    const dependenciesPath = path.resolve(
      __dirname,
      "../../node_modules/md-turborepo/apps/docs/dependencies.json"
    );
    const dependenciesFile = JSON.parse(
      fs.readFileSync(dependenciesPath, "utf8")
    );
    this.componentsToCopy = dependenciesFile.components;

    this.log("Found components:", this.componentsToCopy);
  }

  _collectDependenciesFromJson(componentsPath, componentName) {
    // Check if the component has a dependencies.json file and extract dependencies
    const componentDependenciesPath = path.join(
      componentsPath,
      componentName,
      "dependencies.json"
    );
    let componentDependencies = [];

    if (fs.existsSync(componentDependenciesPath)) {
      const componentDependenciesFile = JSON.parse(
        fs.readFileSync(componentDependenciesPath, "utf8")
      );
      componentDependencies = componentDependenciesFile.packages || [];
    }

    return componentDependencies;
  }

  writing() {
    const componentsPath = path.resolve(
      __dirname,
      "../../node_modules/md-components-library/src/components"
    );
    const destinationRoot = path.join(
      this.destinationRoot(),
      "packages/components"
    );

    ncp.limit = 16; // Controls how many concurrent file streams

    let allDependencies = new Set(); // To store unique package dependencies
    let copiedAnyComponent = false; // To track if anything was copied

    this.componentsToCopy.forEach(componentName => {
      const sourceModulePath = path.join(componentsPath, componentName);
      const destinationPath = path.join(destinationRoot, componentName);

      // Ensure the destination directory exists
      fs.mkdirSync(destinationPath, { recursive: true }, err => {
        if (err) {
          return console.error("Error creating directory:", err);
        }
      });

      // Copy the component files except dependencies.json
      const files = fs.readdirSync(sourceModulePath);
      let copiedFilesCount = 0;

      files.forEach(file => {
        if (file !== 'dependencies.json') {
          const sourceFilePath = path.join(sourceModulePath, file);
          const destFilePath = path.join(destinationPath, file);

          // Skip unsupported file types
          const stats = fs.statSync(sourceFilePath);
          if (stats.isFile() || stats.isDirectory()) {
            try {
              if (stats.isFile()) {
                fs.copyFileSync(sourceFilePath, destFilePath);
              } else if (stats.isDirectory()) {
                fs.mkdirSync(destFilePath, { recursive: true });
                // Recursively copy directory contents
                this._copyDirectory(sourceFilePath, destFilePath);
              }
              copiedFilesCount++;
            } catch (err) {
              console.error(`Error copying file ${file}:`, err);
            }
          } else {
            console.log(`Skipping unsupported file type: ${file}`);
          }
        }
      });

      if (copiedFilesCount > 0) {
        copiedAnyComponent = true;
        console.log(componentName, " copied successfully");
      }

      // Collect dependencies from component dependencies.json
      const componentDependencies = this._collectDependenciesFromJson(
        componentsPath,
        componentName
      );
      componentDependencies.forEach(dep => allDependencies.add(dep));
    });

    if (copiedAnyComponent) {
      // Create a package.json with the collected dependencies
      const packageJson = {
        name: "md-components",
        version: "1.0.0",
        dependencies: {}
      };

      allDependencies.forEach(dep => {
        packageJson.dependencies[dep] = "latest"; // Customize versioning if needed
      });

      fs.writeFileSync(
        path.join(destinationRoot, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      console.log(
        "package.json created with dependencies:",
        Array.from(allDependencies)
      );
    }
  }

  _copyDirectory(source, destination) {
    const files = fs.readdirSync(source);
    files.forEach(file => {
      const sourcePath = path.join(source, file);
      const destinationPath = path.join(destination, file);
      const stats = fs.statSync(sourcePath);

      if (stats.isFile()) {
        fs.copyFileSync(sourcePath, destinationPath);
      } else if (stats.isDirectory()) {
        fs.mkdirSync(destinationPath, { recursive: true });
        this._copyDirectory(sourcePath, destinationPath); // Recursively copy
      }
    });
  }

  install() {
    const destinationRoot = path.join(this.destinationRoot(), "packages/components");

    // Only run installDependencies if something was copied
    if (fs.existsSync(destinationRoot) && fs.readdirSync(destinationRoot).length > 0) {
      this.log('Installing dependencies in /packages/components...');
      this.spawnCommandSync('npm', ['install'], { cwd: destinationRoot });
    }
  }
};
