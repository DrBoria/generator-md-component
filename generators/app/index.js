'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const path = require('path');
const fs = require('fs');
const ncp = require('ncp').ncp;

module.exports = class extends Generator {
  prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the glorious ${chalk.red('generator-md-component')} generator!`
      )
    );

    const componentsPath = path.resolve(
      __dirname,
      '../../node_modules/md-components-library/src/components'
    );
    // Read the directory contents
    const moduleContent = fs.readdirSync(componentsPath);

    const prompts = [
      {
        type: "checkbox",
        name: "selectedComponents",
        message: "select rules for your project:",
        choices: moduleContent.map(component => (
          {
            name: component,
            value: component,
            checked: false,
          }
        )),
      }
    ];


    return this.prompt(prompts).then(props => {
      this.componentsToCopy = props.selectedComponents; // [ 'Button', 'Charts', 'Form', 'Pagination' ]
    });
  }

  writing() {
    ncp.limit = 16; // controls how many concurrent file streams
    this.componentsToCopy.forEach(componentName => {
      const sourceModulePath = path.join( __dirname, '../../node_modules/md-components-library/src/components', componentName);
      const destinationPath = path.join('components', componentName);

      // Ensure the destination directory exists
      fs.mkdirSync(destinationPath, { recursive: true }, (err) => {
        if (err) {
          return console.error('Error creating directory:', err);
        }
      });
      
      ncp(sourceModulePath, destinationPath, function (err) {
        if (err) {
          return console.error(err);
        }
        console.log(componentName, ' copied successfully');
      });
    });


    // this.fs.copy(
    //   this.templatePath('dummyfile.txt'),
    //   this.destinationPath('dummyfile.txt')
    // );
  }

  install() {
    this.installDependencies();
  }
};
