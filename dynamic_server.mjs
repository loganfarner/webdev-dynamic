import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8000;
const root = path.join(__dirname, 'public');
const templates = path.join(__dirname, 'templates');

let app = express();

app.use('/css', express.static(path.join(__dirname, 'public/css')));

const fuelSourceArray = ['biomass', 'coal', 'cogeneration', 'gas', 'geothermal', 'hydro', 'nuclear', 'oil', 'petcoke', 'solar', 'storage', 'waste', 'wave', 'wind', 'other']

let countryArray = [];
let countryCodeArray = [];
const db = new sqlite3.Database(path.join(__dirname, 'powerplant.sqlite3'), sqlite3.OPEN_READONLY, (err)=>{
    if (err){
        console.log('error connecting to database');
    } else {
        console.log('Succesfully connected to database');
        dbSelect('SELECT * FROM country').then((rows) => {
            countryArray = rows;
            for (var i = 0; i < countryArray.length; i++) {
                countryCodeArray[i] = countryArray[i].country_code;
              }
        });
    }
});

//updated
app.get('/power/:source', (req, res) => {
    let source = req.params.source;
    let filePath = path.join(templates, 'temp.html');
    
    
    let query1 = dbSelect('SELECT country_name FROM info '); 
    let query2 = dbSelect('SELECT capacity_mw FROM info  ');  
    let query3 = dbSelect('SELECT primary_fuel  FROM info ');  
    let query4 = dbSelect('SELECT estimated2017 FROM info ');  
    let p2 = fs.promises.readFile(filePath, 'utf-8');

    
    
    if (source != 'index') {
        // Handle the case where source is not 'index'
        res.status(404).type('html').send('File not found');
        return; // Exit the function
    }

    Promise.all([query1, query2, query3, query4, p2]).then(([results1, results2, results3, results4, templateData]) => {
        const chartData = {
            countryNames: results1.map(item => item.country_name),
            energyCapacity: results2.map(item => item.capacity_mw),
            fuelType: results3.map(item => item.primary_fuel),
            estimated2017: results4.map(item => item.estimated2017)
        };
        //console.log(JSON.stringify(chartData));
        templateData = templateData.replace('$$Graph$$', JSON.stringify(chartData));
        res.status(200).type('html').send(templateData);
    }).catch((error) => {
        console.log(error);
        res.status(404).type('html').send('Error');
    });
});

//route for displaying by primary fuel source
app.get('/power/fuel/:source', (req, res) => {
    let primary_fuel_lower = req.params.source;
    const origin='fuel';
    let index = fuelSourceArray.indexOf(primary_fuel_lower);
   
    if (index == -1){ res.status(404).type('txt').send('404 Page Not Found. "'+primary_fuel_lower+'"s is not a valid fuel source.');
        throw new Error('404 Page Not Found. '+primary_fuel_lower+' is not a valid fuel source.')};
    let primary_fuel = primary_fuel_lower.charAt(0).toUpperCase() + primary_fuel_lower.slice(1);
    let previousSource = fuelSourceArray[index-1];
    let nextSource = fuelSourceArray[index+1];
    if (primary_fuel == 'Other'){nextSource = 'biomass'}
    else if (primary_fuel == 'Biomass'){previousSource = 'other'};
    let previousLink = '/power/fuel/' + previousSource;
    let nextLink = '/power/fuel/' + nextSource;
    if (primary_fuel == 'Wave'){primary_fuel = "Wave and Tidal"};
    let headerReplacement = "Plants who's primary fuel source is " + primary_fuel;
    console.log('primary_fuel: ' + primary_fuel);
    let filePath = path.join(templates,'fuel.html');
    let p1 = dbSelect('SELECT * FROM info WHERE primary_fuel = ?', [primary_fuel]);
    let p2 = fs.promises.readFile(filePath, 'utf-8');
    Promise.all([p1,p2]).then((results) => {
        const graph = displayGraph(origin,results[0]);
        console.log(graph);
        let response = displayTable(results, headerReplacement, nextLink, previousLink,graph);
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.log(error);
        //res.status(404).type('txt').send('404 Page Not Found. '+primary_fuel_lower+' is not a valid fuel source.');
    });
});
    


//route for displaying by capacity source
app.get('/power/capacity/:size', (req, res) => {
    let size = req.params.size.toString().toLowerCase();
    console.log('capacity: ' + size);
    let nextLink = '';
    let previousLink = '';
    let filePath = path.join(templates,'capacity.html');
    let p1 = null;
    const origin="capacity";
    if (size == 'low'){
        p1 = dbSelect('SELECT * FROM info WHERE capacity_mw <200');
        nextLink = '/power/capacity/medium';
        previousLink = '/power/capacity/high';
    } else if (size == 'medium'){
        p1 = dbSelect('SELECT * FROM info WHERE capacity_mw >=200 and capacity_mw <=600');
        nextLink = '/power/capacity/high';
        previousLink = '/power/capacity/low';
    } else if (size == 'high'){
        p1 = dbSelect('SELECT * FROM info WHERE capacity_mw >600');
        nextLink = '/power/capacity/low';
        previousLink = '/power/capacity/medium';
    } else {
        res.status(404).type('txt').send('404 page not found. Capacity "' + size +'" invalid.');
        throw new Error();
    }
    let p2 = fs.promises.readFile(filePath, 'utf-8');
    Promise.all([p1,p2]).then((results) => {
        const graph = displayGraph(origin,results[0]);
        console.log(graph);
        let headerReplacement = "Plants with " + size + " capacity";
        let response = displayTable(results, headerReplacement, nextLink, previousLink,graph);
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.log(error);
        //res.status(404).type('txt').send('');
    });
});

//route for country
app.get('/power/country/:code', (req, res) => {
    let country_lower = req.params.code.toString().toUpperCase();
    console.log(country_lower);
    let index = countryCodeArray.indexOf(country_lower);
    if (index == -1){ res.status(404).type('txt').send('404 Page Not Found. '+country_lower+' is not a valid country code.');
        throw new Error('404 Page Not Found. '+country_lower+' is not a valid country code.')};
    let code_country = country_lower.charAt(0).toUpperCase() + country_lower.slice(1);
    let previousSource = countryCodeArray[index-1];
    let nextSource = countryCodeArray[index+1];
    if (code_country == 'ZWE'){nextSource = 'AFG'}
    else if (code_country == 'AFG'){previousSource = 'ZWE'};
    let previousLink = '/power/country/' + previousSource;
    let nextLink = '/power/country/' + nextSource;
    let countryName = countryArray[index].country_name;
    let headerReplacement = "Plants in " + countryName;
    console.log('country: ' + code_country);
    let filePath = path.join(templates,'country.html');
    let p1 = dbSelect('SELECT * FROM info WHERE country_code = ?', [code_country]);
    let p2 = fs.promises.readFile(filePath, 'utf-8');
    Promise.all([p1,p2]).then((results) => {
        const graph = displayGraph('estimated',results[0]);
        console.log(graph);
        let response = displayTable(results, headerReplacement, nextLink, previousLink,graph);
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.log(error);
        //res.status(404).type('txt').send('404 Page Not Found. '+primary_fuel_lower+' is not a valid fuel source.');
    });
});

//route for displaying by capacity source
app.get('/power/estimated/:size', (req, res) => {
    let size = req.params.size.toString().toLowerCase();
    console.log('estimated electricity: ' + size);
    let nextLink = '';
    let previousLink = '';
    let filePath = path.join(templates,'estimated.html');
    let p1 = null;
    const origin="estimated";
    if (size == 'low'){
        p1 = dbSelect('SELECT * FROM info WHERE estimated2017 <200');
        nextLink = '/power/estimated/medium';
        previousLink = '/power/estimated/high';
    } else if (size == 'medium'){
        p1 = dbSelect('SELECT * FROM info WHERE estimated2017 >=200 and estimated2017 <=1000');
        nextLink = '/power/estimated/high';
        previousLink = '/power/estimated/low';
    } else if (size == 'high'){
        p1 = dbSelect('SELECT * FROM info WHERE estimated2017 >600');
        nextLink = '/power/estimated/low';
        previousLink = '/power/estimated/medium';
    } else {
        res.status(404).type('txt').send('404 page not found. 2017 Estimated Energy Generation "' + size +'" invalid.');
        throw new Error();
    }
    let p2 = fs.promises.readFile(filePath, 'utf-8');
    Promise.all([p1,p2]).then((results) => {
        const graph = displayGraph(origin,results[0]);        
        //templateData = templateData.replace('$$Graph$$', JSON.stringify(chartData));
        let headerReplacement = "Plants with " + size + " 2017 Estimated Energy Generation";
        let response = displayTable(results, headerReplacement, nextLink, previousLink,graph);
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.log(error);
        //res.status(404).type('txt').send('');
    });
});

/*app.get('/home', (req, res) => {
    let finishAndSend = function() {
        fs.readFile(path.join(templates, 'home.html'), 'utf-8', (err, data) => {
            let countries = '';

            for (var i = 0; i < countryArray.length; i++) {
                let countryName = countryArray[i].country_name;
                let countryCode = countryArray[i].country_code;
                countries += '<li><a href="./power/country/' + countryCode + '">'+ countryName +'</li>';
            }
            let response = data.replace('$$COUNTRY_LINK$$', countries);
            res.status(200).type('html').send(response);
        });
    };
    finishAndSend();
});*/
app.get('', (req, res) => {
    let headerReplacement = "Displaying All Power Plants";
    let filePath = path.join(templates,'fuel.html');
    let p1 = dbSelect('SELECT * FROM info');
    let p2 = fs.promises.readFile(filePath, 'utf-8');
    Promise.all([p1,p2]).then((results) => {
        const graph = displayGraph('estimated', results[0]);
        let response = displayTable(results, headerReplacement, 'https://powerplant.onrender.com/', 'https://powerplant.onrender.com/', graph);
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.log(error);
        res.status(404).type('txt').send('404 Page Not Found.');
    });
    
/*
    let finishAndSend = function() {
        fs.readFile(path.join(templates, 'home.html'), 'utf-8', (err, data) => {
            let countries = '';

            for (var i = 0; i < countryArray.length; i++) {
                let countryName = countryArray[i].country_name;
                let countryCode = countryArray[i].country_code;
                countries += '<li><a href="./power/country/' + countryCode + '">'+ countryName +'</li>';
            }
            let response = data.replace('$$COUNTRY_LINK$$', countries);
            res.status(200).type('html').send(response);
        });
    };
    finishAndSend();*/
});
//function for the dropdown menu
function countryDropdown(){
    let countries = '';
    for (var i = 0; i < countryArray.length; i++) {
        let countryName = countryArray[i].country_name;
        let countryCode = countryArray[i].country_code;
        countries += '<a href="https://powerplant.onrender.com/power/country/' + countryCode + '">'+ countryName +'</a>';
    }
    return countries;
}


//function for sending the table
function displayTable(results, headerReplacement, nextLink, previousLink,graph){
    let plant_list = results[0];
    
        let response = results[1].replace('$$Sorted_By_Header$$', headerReplacement);
        response = response.replace('%%Previous_Link%%', previousLink);
        response = response.replace('%%Next_Link%%', nextLink);
        response = response.replace('$$Graph$$', JSON.stringify(graph));
        let table_body = '';
        plant_list.forEach((plant_list) => {
            let table_row = '<tr>';
                table_row += '<td>' + plant_list.country_name  + '</td>';
                table_row += '<td>' + plant_list.country_code  + '</td>';
                table_row += '<td>' + plant_list.name          + '</td>';
                table_row += '<td>' + plant_list.gppd_idnr     + '</td>';
                table_row += '<td>' + '<a href="'+plant_list.url+'"target="_blank">'+plant_list.url + '</a></td>';
                table_row += '<td>' + plant_list.capacity_mw   + '</td>';
                table_row += '<td>' + plant_list.primary_fuel  + '</td>';
                table_row += '<td>' + plant_list.estimated2017 + '</td>';
            table_row += '</tr>';
            table_body += table_row;
        });
        
        response = response.replace('$$TABLE_DATA$$', table_body);
        let countries = countryDropdown();
        response = response.replace('$$COUNTRY_LINKS$$', countries);
        return response;
}


function displayGraph(origin,results) {
    let chartData = {
        label1: [],
        label2: []
      };
    
    if(origin=='capacity'){
        chartData = {
            countryNames: results.map(item => item.country_name),
            energyCapacity: results.map(item => item.capacity_mw)
          };

    }else if(origin=='estimated'){
        chartData = {
            countryNames: results.map(item => item.country_name),
            estimated2017: results.map(item => item.estimated2017)
          };

    }else if(origin=='fuel'){
        chartData = {
            countryNames: results.map(item => item.country_name),
            fuelType: results.map(item => item.primary_fuel)
          };

    }
    

    return chartData;
  }
  

function dbSelect(query, params) {
    let p = new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
    return p;
}

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
