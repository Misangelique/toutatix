<?php

require_once __DIR__ . '/../db/DBConnection.php';

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use GuzzleHttp\Psr7;

/* GUESSES PUBLIC ROUTES : see https://www.slimframework.com/docs/v4/ */

/**
 * Post Image and Make a guess ('Asterix' or 'Obelix')
 */
$app->post('/api/guesses', function (Request $request, Response $response) {

    $directory = $this->get('upload_directory');

    // get files from multipart request
    // https://www.slimframework.com/docs/v4/objects/request.html#uploaded-files
    $uploadedFiles = $request->getUploadedFiles();

    if (empty($uploadedFiles['guessimage'])) {
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => "Bad Request : Missing 'guessimage' formdata field  "
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $uploadedFile = $uploadedFiles['guessimage'];

    if ($uploadedFile->getError() !== UPLOAD_ERR_OK) {
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => "Bad Request : Missing 'guessimage' formdata field  "
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $mediaType = $uploadedFile->getClientMediaType();
    if (!in_array($mediaType, ['image/jpeg', 'image/jpg', 'image/png'])) {
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => "Unsupported Media Type : Image must be 'jpg / jpeg / png'"
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
    }

    // generate guess id = time in milliseconds
    $guessId  = round(microtime(true) * 1000);
    $filename = $guessId . '.' . pathinfo($uploadedFile->getClientFilename(), PATHINFO_EXTENSION);

    if (!is_dir($directory)) {
        mkdir($directory, 0777, true);
    }
    $uploadedFile->moveTo($directory . '/' . $filename);

    // call node api for prediction
    // https://odan.github.io/slim4-skeleton/http-client.html
    // https://docs.guzzlephp.org/en/stable/psr7.html#requests
    $client = new GuzzleHttp\Client([
        'base_uri' => 'http://node:3000/',
        'timeout'  => 10,
    ]);

    $nodeResponse = $client->request('POST', 'api/guesses', [
        'multipart' => [
            [
                'name'     => 'guessimage',
                'contents' => Psr7\Utils::tryFopen($directory . '/' . $filename, 'r'),
                'filename' => $filename,
            ]
        ]
    ]);

    $iaAnswer = json_decode($nodeResponse->getBody(), true);
    $guess    = $iaAnswer['guess'] ?? 'unknown';

    // store answer in database
    // see tests route in index.php for DBConnection usage
    $db   = (new DB\DBConnection())->connect();
    $stmt = $db->prepare("INSERT INTO guesses (id, imagepath, guess) VALUES (:id, :imagepath, :guess)");
    $stmt->execute([':id' => $guessId, ':imagepath' => $filename, ':guess' => $guess]);
    $db = null;

    // return 201 (CREATED)
    $response->getBody()->write(json_encode([
        'id'        => $guessId,
        'date'      => gmdate('Y-m-d\TH:i:s', (int)($guessId / 1000)),
        'imagepath' => $filename,
        'guess'     => $guess,
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
});




/**
 * Put Guess Feedback (if AI Win or Not)
 */
$app->put('/api/guesses/{guessid}', function (Request $request, Response $response, array $args) {

    $guessid = $args['guessid'];

    $db   = (new DB\DBConnection())->connect();
    $stmt = $db->prepare("SELECT id FROM guesses WHERE id = :id");
    $stmt->execute([':id' => $guessid]);

    if (!$stmt->fetch()) {
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => 'Resource not found'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    // body is application/json
    $body = json_decode((string) $request->getBody(), true);

    if (!isset($body['win'])) {
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => "Bad Request : Missing 'win' json field  "
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $stmt = $db->prepare("UPDATE guesses SET win = :win WHERE id = :id");
    $stmt->execute([':win' => (int) $body['win'], ':id' => $guessid]);

    $stmt = $db->prepare("SELECT COUNT(*) as total, SUM(CASE WHEN win = 1 THEN 1 ELSE 0 END) as win FROM guesses WHERE win IS NOT NULL");
    $stmt->execute();
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    $db = null;

    $response->getBody()->write(json_encode([
        'total' => (int) $stats['total'],
        'win'   => (int) $stats['win'],
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});
