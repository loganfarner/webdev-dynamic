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



const db = new sqlite3.Database(path.join(__dirname, 'powerplant.sqlite3'), sqlite3.OPEN_READONLY, (err)=>{
    if (err){
        console.log('error connecting to database');
    } else {
        console.log('Succesfully connected to database');
    }
});



//updated
app.get('/power/:source', (req, res) => {
    
    let source = req.params.source.toLowerCase();
    let filePath = "";

    if (source === '/' || source === "index") {

        filePath = path.join(templates, 'temp.html'); 
        let query1 = dbSelect('SELECT country_name as Country, capacity_mw as Capacity FROM info');
        let p2 = fs.promises.readFile(filePath, 'utf-8');

        Promise.all([query1, p2]).then(([results, templateData]) => {
            let response = templateData.replace('$$GraphData$$', JSON.stringify(results));
            res.status(200).type('html').send(response);
        }).catch((error) => {
            console.log(error);
            res.status(404).type('html').send('Error');
        });
   //updated
    } else {
        res.status(404).type('html').send('File not found');
    }
});

//route for displaying by primary fuel source
app.get('/power/fuel/:source', (req, res) => {
    let primary_fuel_lower = req.params.source;
    const primary_fuel = primary_fuel_lower.charAt(0).toUpperCase() + primary_fuel_lower.slice(1);
    console.log('primary_fuel: ' + primary_fuel);
    let filePath = path.join(templates,'fuel.html');
    let p1 = dbSelect('SELECT * FROM info WHERE primary_fuel = ?', [primary_fuel]);
    let p2 = fs.promises.readFile(filePath, 'utf-8');
    Promise.all([p1,p2]).then((results) => {
        let response = displayTable(results,"Plants who's primary fuel source is " + primary_fuel );
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.log(error);
        res.status(404).type('txt').send('Error Dumb Dumb');
    });
});

//route for displaying by primary fuel source
app.get('/power/capacity/:size', (req, res) => {
    let size = req.params.size.toString().toLowerCase();
    console.log('capacity: ' + size);
    let filePath = path.join(templates,'capacity.html');
    let p1 = null;
    if (size == 'low'){
        p1 = dbSelect('SELECT * FROM info WHERE capacity_mw <200');
        console.log('low capacity selected');
    } else if (size == 'medium'){
        p1 = dbSelect('SELECT * FROM info WHERE capacity_mw >=200 and capacity_mw <=600');
    } else if (size == 'high'){
        p1 = dbSelect('SELECT * FROM info WHERE capacity_mw >600');
    } else {
        res.status(404).type('txt').send('Page not found');
    }
    let p2 = fs.promises.readFile(filePath, 'utf-8');
    Promise.all([p1,p2]).then((results) => {
        let response = displayTable(results, "Plants with " + size + " capacity");
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.log(error);
        res.status(404).type('txt').send('Error Dumb Dumb');
    });
});

//function for sending the table
function displayTable(results, headerReplacement){
    let plant_list = results[0];
        let response = results[1].replace('$$Sorted_By_Header$$', headerReplacement);
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
        return response;
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


