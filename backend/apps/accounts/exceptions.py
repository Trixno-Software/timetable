from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        custom_response = {
            "code": response.status_code,
            "message": "An error occurred",
            "details": response.data,
        }

        # Handle specific error types
        if response.status_code == 401:
            custom_response["message"] = "Authentication failed"
        elif response.status_code == 403:
            custom_response["message"] = "Permission denied"
        elif response.status_code == 404:
            custom_response["message"] = "Resource not found"
        elif response.status_code == 400:
            custom_response["message"] = "Invalid request"

        response.data = custom_response

    return response
