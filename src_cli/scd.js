/*
    Soundcloud Downloader CLI
    Made by Citrizon.
*/
process.title = "scd";
process.pwd = process.cwd();

const Libraries   = new ( require( './libs' ) );
const Soundcloud  = require( '../src/main' );
const Package     = require( '../package' );
const ProgressBar = require( 'progress' );
const ID3         = require( 'node-id3' );
const Path        = require( 'path' );
const Filesystem  = require( 'fs' );

const ConfigLocation = Path.join( require.main.path, "client.json" );

Libraries.commander
  .version( Package.version, '-v, --version'          )
  .usage  ( '[OPTIONS] <Song Url(s)>'                    )
  .option ( '-n, --no-id3', 'Do not include ID3 tags' )
  .option ( '-c, --clientId <id>', 'Specify a Client ID', null )
  .parse  ( process.argv                              );

const opts = Libraries.commander.opts();
const link = Libraries.commander.args;

console.log( 
  `Soundcloud Downloader Client [ v${Package.version} ]\n` +
  `Made by ${Package.author}. Open-Source Project.\n` 
);

if (      link.length == 0     ) console.die( 4, 'Links are not supplied.'   );
if ( !SCDCLI.checkURLS( link ) ) console.die( 5, 'Invalid link(s) supplied.' );

async function clientId () {
    let cid = opts.clientId ?? ( Filesystem.existsSync( ConfigLocation ) ? Filesystem.readFileSync( ConfigLocation, { encoding: 'utf-8' } ) : null );
    if ( !cid ) {
        console.log( ':: Generating ClientID...' );
        cid = await Soundcloud.generateClientID()
    } else {
        console.log( ':: Verifying ClientID...' );
        if ( await Soundcloud.verifyClientID( cid ) ) return cid;
        else cid = await Soundcloud.generateClientID()
    }
    Filesystem.writeFileSync( ConfigLocation, JSON.stringify( { clientId: cid } ) );
    return cid;
}

void async function () {
    const Instance = new Soundcloud( { clientId: await clientId() } );

    console.log(
        `:: Settings ->\n` +
        `   • ID3 Enabled: ${opts.id3 ? 'Yes' : 'Nope'}`
    );

    console.log( ':: Downloading Song Data...' );
    const Iter = SCDCLI.createIterator( async ( songUrl ) => {
        console.log( `   -> Downloading '${songUrl.substring(23)}'` );
        const resolvedSong = await Instance.resolveSong( songUrl );
        let albumart; if ( opts.id3 ) albumart = await resolvedSong.album.fetchArt();
        let pbar;
        const filename =  Path.join( process.pwd, SCDCLI.pathsafe( resolvedSong.artist + " - " + resolvedSong.name ) + ".mp3" );
        let stream = Filesystem.createWriteStream( filename, { flags: 'w' } );
        resolvedSong.DownloadSong( stream, len => {
            pbar = new ProgressBar( '      [:bar] :percent :etas', {
                width: 20,
                complete: '=',
                incomplete: ' ',
                renderThrottle: 1,
                total: len
            } );
        }, progress => {
            if ( typeof pbar !== "undefined" ) pbar.tick( progress.bytes );
        }, async () => {
            pbar.update(1);
            pbar.terminate();
            pbar = undefined;
            if ( opts.id3 ) ID3.write({
                title: resolvedSong.name,
                artist: resolvedSong.artist,
                genre: resolvedSong.genre,
                album: resolvedSong.album.name,
                image: {
                    mime: 'image/jpeg',
                    type: {
                        id: ID3.TagConstants.AttachedPicture.PictureType.FRONT_COVER
                    },
                    description: resolvedSong.album.name,
                    imageBuffer: albumart
                }
            }, filename);
            Iter.iterate();
        } );
    }, link, SCDCLI.normalizeURL );
    
    Iter.iterate();
} ();
