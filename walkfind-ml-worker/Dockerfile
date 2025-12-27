FROM public.ecr.aws/lambda/python:3.11

RUN yum update -y && \
    yum install -y gcc gcc-c++ make git

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu

COPY . ./

CMD ["walkfind_ml_worker.lambda_handler.handler"]