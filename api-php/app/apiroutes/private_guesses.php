<?php

require_once __DIR__ . '/../auth/JwtHandler.php';
require_once __DIR__ . '/../auth/Exceptions.php';
require_once __DIR__ . '/../db/DBConnection.php';
require_once __DIR__ . '/../utils/AutoDeleteStream.php';

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;


/**
 * Get All Guesses History
 * 200 : array of Guess { id, date, imagepath, guess, win }
 * 401 : AuthError
 */
$app->get('/api/guesses', function (Request $request, Response $response) {

    try {
        $tokenData = get_token_infos($request);

        try {
            $db   = (new DB\DBConnection())->connect();
            $stmt = $db->prepare("SELECT * FROM guesses ORDER BY id DESC");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $db   = null;

            $guesses = array_map(function ($row) {
                return [
                    'id'        => (int) $row['id'],
                    'date'      => date(DATE_RFC2822, (int) ($row['id'] / 1000)),
                    'imagepath' => $row['imagepath'],
                    'guess'     => $row['guess'],
                    'win'       => $row['win'] !== null ? (int) $row['win'] : null,
                ];
            }, $rows);

            $response->getBody()->write(json_encode($guesses));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (PDOException $e) {
            $response->getBody()->write('{"success": false, "message": "' . $e->getMessage() . '"}');
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }

    } catch (Auth\UnauthenticatedException $e) {
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => 'Authentication Issue : Failed to authenticate token or no token provided'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
});

/**
 * Download images archive classified by character and prediction result
 * Structure : Images/Asterix|Obelix/GoodPred|BadPred/<filename>
 * (win=NULL or win=0 excluded)
 * 200 : application/zip
 * 401 : AuthError
 */
$app->get('/api/guesses/images', function (Request $request, Response $response) {
    $directory = $this->get('upload_directory');

    try {
        $tokenData = get_token_infos($request);

        try {
            $db   = (new DB\DBConnection())->connect();
            $stmt = $db->prepare("SELECT * FROM guesses WHERE win IS NOT NULL AND win != 0");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
            $filespaths   = [];
            $entriesnames = [];

            foreach ($rows as $row) {
                $character  = ucfirst(strtolower($row['guess']));
                $predFolder = ($row['win'] == 1) ? 'GoodPred' : 'BadPred';
                $filepath   = $directory . '/' . $row['imagepath'];

                if (file_exists($filepath)) {
                    $filespaths[]   = $filepath;
                    $entriesnames[] = 'Images/' . $character . '/' . $predFolder . '/' . $row['imagepath'];
                }
            }

            $zipPath = $directory . '/archive.zip';
            $zipName = 'archive.zip';
            createZip($filespaths, $entriesnames, $zipPath);

            return $response
                ->withHeader('Content-Type', 'application/zip')
                ->withHeader('Content-Disposition', 'attachment; filename=' . $zipName)
                ->withHeader('Content-Length', filesize($zipPath))
                ->withBody(AutoDeleteStream::createFromFilePath($zipPath));

        } catch (PDOException $e) {
            $response->getBody()->write('{"success": false, "message": "' . $e->getMessage() . '"}');
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }

    } catch (Auth\UnauthenticatedException $e) {
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => 'Authentication Issue : Failed to authenticate token or no token provided'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
});



/**
 * Delete all guesses from DB and images from filesystem (admin only)
 * 200 : GuessesClean { success, message }
 * 401 : AuthError
 * 403 : AccessDenied
 */
$app->delete('/api/guesses', function (Request $request, Response $response) {
    $directory = $this->get('upload_directory');

    try {
        $tokenData = get_token_infos($request);
        $admin     = $tokenData->admin ?? false;

        if (!$admin) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => "Access Denied : Not Allowed Operation with user's privilege"
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

        $db   = (new DB\DBConnection())->connect();
        $stmt = $db->prepare("SELECT imagepath FROM guesses");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $db->exec("DELETE FROM guesses");
       

        foreach ($rows as $row) {
            $filepath = $directory . '/' . $row['imagepath'];
            if (file_exists($filepath)) {
                unlink($filepath);
            }
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'All Guesses deleted'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (Auth\UnauthenticatedException $e) {
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => 'Authentication Issue : Failed to authenticate token or no token provided'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
});


function createZip($filespaths, $entriesnames, $zipFileName)
{
    $zip = new \ZipArchive();
    if ($zip->open($zipFileName, \ZipArchive::CREATE) !== TRUE) {
        exit("cannot open <$zipFileName>\n");
    }
    for ($i = 0; $i < count($filespaths); $i++) {
        $zip->addFile($filespaths[$i], $entriesnames[$i]);
    }
    $zip->close();
}



function get_token_infos(Request $request)
{
    if (!$request->hasHeader('Authorization')) {
        throw new Auth\UnauthenticatedException('Authentication Issue : Failed to authenticate token or no token provided');
    }

    list($token) = sscanf($request->getHeaderLine('Authorization'), 'Bearer %s');

    try {
        return (new Auth\JwtHandler())->_jwt_decode_data($token);
    } catch (Exception $e) {
        throw new Auth\UnauthenticatedException('Authentication Issue : Failed to authenticate token or no token provided');
    }
}
