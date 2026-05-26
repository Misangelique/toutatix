<?php

require_once __DIR__ . '/../auth/JwtHandler.php';
require_once __DIR__ . '/../db/DBConnection.php';

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;


/**
 * Post Login - check credentials and return JWT token
 */
$app->post('/api/login', function (Request $request, Response $response) {

    $body  = json_decode((string) $request->getBody(), true);
    $email = $body['email'] ?? null;
    $pass  = $body['pass']  ?? null;

    if (!$email || !$pass) {
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => 'Authentication failed. User not found.'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    try {
        $db   = (new DB\DBConnection())->connect();
        $stmt = $db->prepare("SELECT * FROM users WHERE username = :email AND password = :pass");
        $stmt->execute([':email' => $email, ':pass' => $pass]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $db   = null;
    } catch (PDOException $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }

    if (!$user) {
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => 'Authentication failed. User not found.'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    $token = (new Auth\JwtHandler())->_jwt_encode_data(
        'Toutatix.iutsd',
        ['username' => $user['username'], 'admin' => $user['admin']]
    );

    $response->getBody()->write(json_encode([
        'success' => true,
        'message' => 'Enjoy your token!',
        'token'   => $token
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
});
