"use strict";
const Generator = require("yeoman-generator");
const chalk = require("chalk");
const yosay = require("yosay");
const path = require("path");
const fs = require("fs");
const ncp = require("ncp").ncp;

module.exports = class extends Generator {
  prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the glorious ${chalk.red(
          "generator-md-component"
        )} generator!`
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

    // No need for user prompts anymore, since we're taking components from dependencies.json
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

    this.componentsToCopy.forEach(componentName => {
      const sourceModulePath = path.join(componentsPath, componentName);
      const destinationPath = path.join(destinationRoot, componentName);

      // Ensure the destination directory exists
      fs.mkdirSync(destinationPath, { recursive: true }, err => {
        if (err) {
          return console.error("Error creating directory:", err);
        }
      });

      // Copy the component files
      ncp(sourceModulePath, destinationPath, function(err) {
        if (err) {
          return console.error(err);
        }

        console.log(componentName, " copied successfully");
      });

      // Collect dependencies from component dependencies.json
      const componentDependencies = this._collectDependenciesFromJson(
        componentsPath,
        componentName
      );
      componentDependencies.forEach(dep => allDependencies.add(dep));
    });

    // Create a package.json with the collected dependencies
    const packageJson = {
      name: "md-components",
      version: "1.0.0",
      dependencies: {}
    };

    allDependencies.forEach(dep => {
      packageJson.dependencies[dep] = "latest"; // You may customize the versioning as needed
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

  install() {
    this.installDependencies();
  }
};
