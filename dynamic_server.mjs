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

      
    }else if (source == 'fuel') {
        filePath = path.join(templates,'fuel.html');
        let p1 = dbSelect('SELECT * FROM country_plant WHERE mfr = ?', [plant]);
    //let p2 = dbSelect('SELECT * FROM Manufacturers WHERE id = ?', [manufacturer],);
    let p2 = promises.readFile(filePath, 'utf-8');
    Promise.all([p1,p2]).then((results) => {
        let source = results[0].primary_fuel;
        let plant_list = results[0];
        let response = results[1].replace('$$Plant_Fuel_Header$$', "Plants who's primary fuel source is " + source );
        let table_body = '';
        cereal_list.forEach((cereal) => {
            let table_row = '<tr>';
                table_row += '<td>' + plant_list.name       + '</td>';
                table_row += '<td>' + plant_list.type       + '</td>';
                table_row += '<td>' + plant_list.calories   + '</td>';
                table_row += '<td>' + plant_list.fat        + '</td>';
                table_row += '<td>' + plant_list.protein    + '</td>';
                table_row += '<td>' + plant_list.carbs      + '</td>';
            table_row += '</tr>';
            table_body += table_row;
        });
        response = response.replace('$$TABLE_DATA$$', table_body);
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.log(error);
        res.status(404).type('txt').send('Error Dumb Dumb');
    });
   //updated
    } else if (source == "capacity") {
        // Handle capacity code
    } else {
        res.status(404).type('html').send('File not found');
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
});



/*
//Fuel Source template filler
//Logan
app.get('/fuel/:source', (req, res)=>{
    let source = req.params.name.toUpperCase();
    console.log(source);
    let filePath = path.join(template,'fule.html');

    let p1 = dbSelect('SELECT * FROM country_plant WHERE mfr = ?', [plant]);
    //let p2 = dbSelect('SELECT * FROM Manufacturers WHERE id = ?', [manufacturer],);
    let p2 = promises.readFile(filePath, 'utf-8');
    Promise.all([p1,p2]).then((results) => {
        let source = results[0].primary_fuel;
        let plant_list = results[0];
        let response = results[1].replace('$$Plant_Fuel_Header$$', "Plants who's primary fuel source is " + source );
        let table_body = '';
        cereal_list.forEach((cereal) => {
            let table_row = '<tr>';
                table_row += '<td>' + plant_list.name       + '</td>';
                table_row += '<td>' + plant_list.type       + '</td>';
                table_row += '<td>' + plant_list.calories   + '</td>';
                table_row += '<td>' + plant_list.fat        + '</td>';
                table_row += '<td>' + plant_list.protein    + '</td>';
                table_row += '<td>' + plant_list.carbs      + '</td>';
            table_row += '</tr>';
            table_body += table_row;
        });
        response = response.replace('$$TABLE_DATA$$', table_body);
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.log(error);
        res.status(404).type('txt').send('Error Dumb Dumb');
    });
});*/

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});


