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

//route for displaying by primary fuel source
app.get('/:source', (req, res) => {
    let source_lowerCase = req.params.source.toString().toLowerCase();
    if (fuelSourceArray.indexOf(source_lowerCase) != -1){
        let primary_fuel_lower = source_lowerCase;
        const origin='fuel';
        let index = fuelSourceArray.indexOf(primary_fuel_lower);
        let primary_fuel = primary_fuel_lower.charAt(0).toUpperCase() + primary_fuel_lower.slice(1);
        let previousSource = fuelSourceArray[index-1];
        let nextSource = fuelSourceArray[index+1];
        if (primary_fuel == 'Other'){nextSource = 'biomass'}
        else if (primary_fuel == 'Biomass'){previousSource = 'other'};
        let previousLink = '/' + previousSource;
        let nextLink = '/' + nextSource;
        if (primary_fuel == 'Wave'){primary_fuel = "Wave and Tidal"};
        let headerReplacement = "Plants who's primary fuel source is " + primary_fuel;
        let filePath = path.join(templates,'fuel.html');
        let p1 = dbSelect('SELECT * FROM info WHERE primary_fuel = ?', [primary_fuel]);
        let p2 = fs.promises.readFile(filePath, 'utf-8');
        Promise.all([p1,p2]).then((results) => {
            const graph = displayGraph(origin,results[0]);
            let response = displayTable(results, headerReplacement, nextLink, previousLink,graph);
            res.status(200).type('html').send(response);
        }).catch((error) => {
            console.log(error);
            //res.status(404).type('txt').send('404 Page Not Found. '+primary_fuel_lower+' is not a valid fuel source.');
        });
    } else if(source_lowerCase == 'capacitylow' || source_lowerCase == 'capacitymedium' || source_lowerCase == 'capacityhigh'){
        let size = source_lowerCase;
        let nextLink = '';
        let previousLink = '';
        let filePath = path.join(templates,'fuel.html');
        let p1 = null;
        const origin="capacity";
        if (size == 'capacitylow'){
            p1 = dbSelect('SELECT * FROM info WHERE capacity_mw <200');
            nextLink = 'http://localhost:8000/medium';
            previousLink = 'http://localhost:8000/high';
            size = 'low';
        } else if (size == 'capacitymedium'){
            p1 = dbSelect('SELECT * FROM info WHERE capacity_mw >=200 and capacity_mw <=600');
            nextLink = 'http://localhost:8000/high';
            previousLink = 'http://localhost:8000/low';
            size = 'medium';
        } else if (size == 'capacityhigh'){
            p1 = dbSelect('SELECT * FROM info WHERE capacity_mw >600');
            nextLink = 'http://localhost:8000/low';
            previousLink = 'http://localhost:8000/medium';
            size = 'high';
        } else {
            res.status(404).type('txt').send('404 page not found. Capacity "' + size +'" invalid.');
            throw new Error();
        }
        let p2 = fs.promises.readFile(filePath, 'utf-8');
        Promise.all([p1,p2]).then((results) => {
            const graph = displayGraph(origin,results[0]);
            let headerReplacement = "Plants with " + size + " capacity";
            let response = displayTable(results, headerReplacement, nextLink, previousLink,graph);
            res.status(200).type('html').send(response);
        }).catch((error) => {
            console.log(error);
            //res.status(404).type('txt').send('');
        });  
    } else if(countryCodeArray.indexOf(source_lowerCase.toUpperCase()) != -1 && source_lowerCase != 'high'){
        let country_lower = req.params.source.toString().toUpperCase();
        let index = countryCodeArray.indexOf(country_lower);
        let code_country = country_lower.charAt(0).toUpperCase() + country_lower.slice(1);
        let previousSource = countryCodeArray[index-1];
        let nextSource = countryCodeArray[index+1];
        if (code_country == 'ZWE'){nextSource = 'AFG'}
        else if (code_country == 'AFG'){previousSource = 'ZWE'};
        let previousLink = '/' + previousSource;
        let nextLink = '/' + nextSource;
        let countryName = countryArray[index].country_name;
        let headerReplacement = "Plants in " + countryName;
        let filePath = path.join(templates,'fuel.html');
        let p1 = dbSelect('SELECT * FROM info WHERE country_code = ?', [code_country]);
        let p2 = fs.promises.readFile(filePath, 'utf-8');
        Promise.all([p1,p2]).then((results) => {
            const graph = displayGraph('estimated',results[0]);
            let response = displayTable(results, headerReplacement, nextLink, previousLink,graph);
            res.status(200).type('html').send(response);
        }).catch((error) => {
            console.log(error);
            //res.status(404).type('txt').send('404 Page Not Found. '+primary_fuel_lower+' is not a valid fuel source.');
        });
    } else if(source_lowerCase == 'low' || source_lowerCase == 'medium' || source_lowerCase == 'high'){
        let size = source_lowerCase;
        let nextLink = '';
        let previousLink = '';
        let filePath = path.join(templates,'fuel.html');
        let p1 = null;
        const origin="estimated";
        if (size == 'low'){
            p1 = dbSelect('SELECT * FROM info WHERE estimated2017 <200');
            nextLink = 'medium';
            previousLink = 'high';
        } else if (size == 'medium'){
            p1 = dbSelect('SELECT * FROM info WHERE estimated2017 >=200 and estimated2017 <=1000');
            nextLink = 'high';
            previousLink = 'low';
        } else if (size == 'high'){
            p1 = dbSelect('SELECT * FROM info WHERE estimated2017 >600');
            nextLink = 'low';
            previousLink = 'medium';
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
    } else {
        res.status(404).type('txt').send('404 Page Not Found. "'+source_lowerCase+'"s is not a valid fuel source, capacity, country code, nor 2017 estimated energy generation.');
        throw new Error('404 Page Not Found. "'+source_lowerCase+'"s is not a valid fuel source, capacity, country code, nor 2017 estimated energy generation.');
    }
});

app.get('', (req, res) => {
    let headerReplacement = "Displaying All Power Plants";
    let filePath = path.join(templates,'fuel.html');
    let p1 = dbSelect('SELECT * FROM info');
    let p2 = fs.promises.readFile(filePath, 'utf-8');
    Promise.all([p1,p2]).then((results) => {
        const graph = displayGraph('estimated', results[0]);
        let response = displayTable(results, headerReplacement, 'http://localhost:8000/', 'http://localhost:8000/', graph);
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.log(error);
        res.status(404).type('txt').send('404 Page Not Found.');
    });
    

});
//function for the dropdown menu
function countryDropdown(){
    let countries = '';
    for (var i = 0; i < countryArray.length; i++) {
        let countryName = countryArray[i].country_name;
        let countryCode = countryArray[i].country_code;
        countries += '<a href="http://localhost:8000/' + countryCode + '">'+ countryName +'</a>';
        //countries += '<a href="https://powerplant.onrender.com/power/country/' + countryCode + '">'+ countryName +'</a>';
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
                table_row += '<td style="max-width: 10%;overflow: hidden;text-overflow: ellipsis;">' + '<a href="'+plant_list.url+'"target="_blank">'+plant_list.name + '</a></td>';
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
