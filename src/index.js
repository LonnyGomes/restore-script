const fs = require('fs-extra');
const path = require('path');
const DATA_EXT = '.CHK'; // extension of source files to rename
const SOURCE_PATH = path.resolve('data');
const DEST_PATH = path.resolve('files');
const readline = require('readline');
const chalk = require('chalk');
const term = require('terminal-kit').terminal;

const log = console.log;
const INPUT_FILE = 'file_types.txt';

const files = {}; // hash to store resulting files

const genBanner = () => {
    const projectStr = `
                                                                    
    _|_|_|                        _|                        _|      
    _|    _|  _|  _|_|    _|_|          _|_|      _|_|_|  _|_|_|_|  
    _|_|_|    _|_|      _|    _|  _|  _|_|_|_|  _|          _|      
    _|        _|        _|    _|  _|  _|        _|          _|      
    _|        _|          _|_|    _|    _|_|_|    _|_|_|      _|_|  
                                  _|                                
                                _|                                  `;
    const mendTaylorStr = `
                                                                                                        
    _|      _|                            _|      _|_|_|_|_|                    _|                      
    _|_|  _|_|    _|_|    _|_|_|      _|_|_|          _|      _|_|_|  _|    _|  _|    _|_|    _|  _|_|  
    _|  _|  _|  _|_|_|_|  _|    _|  _|    _|          _|    _|    _|  _|    _|  _|  _|    _|  _|_|      
    _|      _|  _|        _|    _|  _|    _|          _|    _|    _|  _|    _|  _|  _|    _|  _|        
    _|      _|    _|_|_|  _|    _|    _|_|_|          _|      _|_|_|    _|_|_|  _|    _|_|    _|        
                                                                            _|                          
                                                                        _|_|                            `;

    return (
        chalk.bgMagenta.blue(projectStr) +
        '\n' +
        chalk.bgMagenta.blue(mendTaylorStr)
    );
};
const processLineByLine = async () => {
    const fileStream = fs.createReadStream(INPUT_FILE);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    for await (const line of rl) {
        // Each line in input.txt will be successively available here as `line`.
        processCurLine(line, files);
    }
};

const processCurLine = (curLine, hash) => {
    const [fileName, fileType] = curLine.split(/: /);
    let extension = null;

    const typeMatches = [
        { re: /PDF/i, ext: 'pdf', path: 'pdfs' },
        { re: /Microsoft Word/, ext: 'docx', path: 'docs' },
        { re: /JPEG/i, ext: 'jpg', path: 'images' },
        { re: /PNG/i, ext: 'png', path: 'images' },
        { re: /PC bitmap/i, ext: 'bmp', path: 'images' },
        { re: /Audio file with ID3/i, ext: 'mp3', path: 'audio' },
        { re: /M4A/i, ext: 'm4a', path: 'audio' },
        { re: /Microsoft PowerPoint/i, ext: 'pptx', path: 'power_point' },
        { re: /^data$/i, ext: 'dat', path: 'unknown' },
        { re: /Microsoft ASF/i, ext: 'wma', path: 'audio' },
        { re: /Windows desktop\.ini/i, ext: 'ini', path: 'ini' },
        { re: /Mobipocket/i, ext: 'mobi', path: 'ebooks' },
        { re: /GIF/i, ext: 'gif', path: 'images' },
        { re: /\.MOV\/QT/i, ext: 'mov', path: 'videos' },
        {
            re: /Composite Document File V2 Document/i,
            ext: 'dat',
            path: 'composite_docs',
        },
        {
            re: /Generic INItialization configuration /i,
            ext: 'url',
            path: 'internet_shortcuts',
        },
        { re: /MS Windows shortcut/i, ext: 'lnk', path: 'windows_shortcuts' },
        { re: /MS Windows 95 Internet shortcut/i, ext: 'url', path: 'links' },
        {
            re: /XML 1\.0 document text, UTF-8 Unicode text/i,
            ext: 'plist',
            path: 'apple',
        },
        { re: /iTunes cover art/i, ext: 'art', path: 'apple' },
        { re: /Apple DiskCopy 4.2 image dfm/i, ext: 'dsk', path: 'apple' },
        { re: /SQLite 3.x database/i, ext: 'db', path: 'apple' },
        { re: /tar archive/i, ext: 'tar', path: 'apple' },
        { re: /dBase III DBT/i, ext: 'dbf', path: 'apple' },
    ];

    for (const curr of typeMatches) {
        if (fileType.match(curr.re)) {
            extension = curr.ext;

            if (!hash[extension]) {
                // if hash not defined, add empty array
                hash[extension] = [];
            }

            // save to hash
            hash[extension].push({
                fileType,
                extension,
                fileName,
                path: curr.path,
            });

            break;
        }
    }

    if (extension === null) {
        log(
            chalk.red('Failed to find a match: ') +
                chalk.bgWhite.black(`${fileName} - `) +
                chalk.bgBlue.white(fileType)
        );
    }
};

const copyFiles = async (hash) => {
    const keys = Object.keys(hash);
    let curHash = null;
    let srcFile = null;
    let dstFile = null;
    let newFilename = null;

    log('\n' + chalk.cyan('Copying files ') + chalk.blue('...') + '\n');
    term.up(1);

    const { x, y } = await term.getCursorLocation();
    for (curKey of keys) {
        term.moveTo(1, y - 1);
        term.eraseDisplayBelow();
        term(chalk.cyan('Handling extension') + ': ' + chalk.blue(curKey));
        curHash = hash[curKey];

        curHash.forEach((file) => {
            newFilename = file.fileName.replace(DATA_EXT, `.${file.extension}`);
            srcFile = path.resolve(SOURCE_PATH, file.fileName);
            dstFile = path.resolve(DEST_PATH, file.path, newFilename);
            fs.ensureDirSync(path.resolve(DEST_PATH, file.path));

            term.moveTo.cyan(
                1,
                y,
                chalk.whiteBright('Copying ') +
                    chalk.cyanBright(srcFile) +
                    ' ' +
                    chalk.magentaBright.bold('=>') +
                    ' ' +
                    chalk.cyanBright(dstFile)
            );

            fs.copyFileSync(srcFile, dstFile);
        });
    }
};

const init = async () => {
    let totalCount = 0;
    try {
        await processLineByLine();
        Object.keys(files).forEach((curKey) => {
            log(chalk.cyan(curKey) + ':\t' + chalk.blue(files[curKey].length));
            totalCount += files[curKey].length;
        });

        log('\n' + chalk.cyan('Total files') + ': ' + chalk.blue(totalCount));

        await copyFiles(files);

        log(
            '\n\n' +
                chalk.cyan('Taylor successfully mended') +
                chalk.blue('!\n')
        );
    } catch (error) {
        log(chalk.red('Encountered error: ') + chalk.blue(error.message));
    }
};

log(genBanner());
log(chalk.blue('\nParsing file types ') + chalk.magentaBright('...'));

init();
